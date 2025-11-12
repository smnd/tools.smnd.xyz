import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { DiunWebhookSchema } from '../utils/types.js';
import { statements } from '../models/database.js';
import { findWebhookForImage } from '../utils/config.js';

const router: ExpressRouter = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Validate incoming webhook payload
    const result = DiunWebhookSchema.safeParse(req.body);

    if (!result.success) {
      console.error('Invalid Diun webhook payload:', result.error);
      res.status(400).json({ error: 'Invalid webhook payload', details: result.error });
      return;
    }

    const payload = result.data;
    console.log('Received Diun webhook:', {
      image: payload.image,
      container: payload.metadata?.ctn_names,
      digest: payload.digest,
    });

    // Find matching webhook configuration
    const containerName = payload.metadata?.ctn_names;
    const webhookConfig = findWebhookForImage(payload.image, containerName);

    if (!webhookConfig) {
      console.warn(`No webhook configuration found for image: ${payload.image}`);
      // Still return 200 to avoid Diun retry spam
      res.json({
        success: true,
        message: 'No matching webhook configuration',
        skipped: true,
      });
      return;
    }

    // Insert or update pending update
    try {
      statements.insertUpdate.run(
        payload.image,
        containerName || null,
        payload.metadata?.ctn_id || null,
        webhookConfig.stack || null,
        null, // current_digest (we don't track this)
        payload.digest,
        webhookConfig.webhook_url,
        JSON.stringify(payload.metadata || {})
      );

      console.log('Update record created:', {
        image: payload.image,
        container: containerName,
        stack: webhookConfig.stack,
      });

      res.json({
        success: true,
        message: 'Update recorded successfully',
      });
    } catch (error) {
      // Check if it's a UNIQUE constraint violation
      if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
        console.log('Duplicate update ignored (already pending)');
        res.json({
          success: true,
          message: 'Update already pending',
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error processing Diun webhook:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
