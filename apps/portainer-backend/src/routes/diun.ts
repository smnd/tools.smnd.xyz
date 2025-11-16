/**
 * @file Diun webhook receiver and update registration
 *
 * This module handles incoming webhooks from Diun (Docker Image Update Notifier).
 * When Diun detects that a new version of a Docker image is available, it sends
 * a webhook notification to this endpoint.
 *
 * Responsibilities:
 * - Validate Diun webhook payload against schema
 * - Look up matching webhook configuration for the image
 * - Determine stack name from webhook config
 * - Look up stack-level webhook if applicable
 * - Store the pending update in the database with both webhook URLs
 * - Handle duplicate detection (UNIQUE constraint)
 * - Return 200 OK even if no matching webhook (prevents Diun retry spam)
 *
 * The endpoint is intentionally unauthenticated because Diun needs to be able to
 * send notifications without complex authentication setup.
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { DiunWebhookSchema } from '../utils/types.js';
import { statements } from '../models/database.js';
import { findWebhookForImage, findStackWebhook } from '../utils/config.js';

const router: ExpressRouter = Router();

/**
 * POST /webhook - Receive and process Diun image update notifications
 *
 * This endpoint receives webhook notifications from Diun when Docker image updates
 * are detected. It validates the payload, looks up matching webhook configurations,
 * and stores the update as pending for later triggering.
 *
 * Webhook Lookup Process:
 * 1. Validate payload against DiunWebhookSchema
 * 2. Extract container name from metadata
 * 3. Find container-level webhook (exact image + container match)
 * 4. Use webhook's stack to find corresponding stack-level webhook
 * 5. Store BOTH webhooks in the update record
 * 6. Handle duplicates gracefully (return 200 even if already pending)
 *
 * @route POST /api/diun/webhook
 * @authentication None - intentionally public (Diun needs to be able to notify)
 *
 * @param {DiunWebhook} req.body - Diun webhook payload
 * @returns {Object} JSON response with success status
 *
 * @example
 * POST /api/diun/webhook
 * Content-Type: application/json
 *
 * {
 *   "image": "myregistry/myapp:latest",
 *   "digest": "sha256:abc123def456...",
 *   "metadata": {
 *     "ctn_id": "a1b2c3d4e5f6",
 *     "ctn_names": "myapp-prod",
 *     "ctn_state": "running"
 *   }
 * }
 *
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Update recorded successfully"
 * }
 *
 * @response 400 - Invalid webhook payload (validation failed)
 * @response 200 - Webhook processed (success or skipped)
 * @response 500 - Internal server error
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Validate incoming webhook payload against DiunWebhookSchema
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

    // Extract container name from webhook payload metadata
    const containerName = payload.metadata?.ctn_names;

    // Find matching webhook configuration for this container/image
    // This uses priority-based lookup: exact match > image match > container match > stack match
    const containerWebhook = findWebhookForImage(payload.image, containerName);

    // Determine stack name from the container webhook's configuration
    // This allows us to find the corresponding stack-level webhook
    const stackName = containerWebhook?.stack;

    // Find stack-level webhook if we have a stack name
    // Stack webhooks can trigger updates to entire stacks at once
    const stackWebhook = stackName ? findStackWebhook(stackName) : null;

    // If we found neither container nor stack webhook, skip insertion
    // but still return 200 to prevent Diun from retrying indefinitely
    if (!containerWebhook && !stackWebhook) {
      console.warn(`No webhook configuration found for image: ${payload.image}`);
      // Return 200 OK even though we skipped - prevents Diun retry spam
      res.json({
        success: true,
        message: 'No matching webhook configuration',
        skipped: true,
      });
      return;
    }

    // Insert the update record with BOTH container and stack webhook URLs
    // This allows flexibility: can trigger either at container or stack level later
    try {
      statements.insertUpdate.run(
        payload.image,                              // Docker image name
        containerName || null,                      // Container name
        payload.metadata?.ctn_id || null,           // Container ID
        stackName || null,                          // Stack name
        null,                                       // current_digest (not tracked)
        payload.digest,                             // New image digest
        containerWebhook?.webhook_url || null,      // Container webhook URL
        stackWebhook?.webhook_url || null,          // Stack webhook URL
        JSON.stringify(payload.metadata || {})      // Metadata as JSON
      );

      console.log('Update record created:', {
        image: payload.image,
        container: containerName,
        stack: stackName,
        containerWebhook: containerWebhook?.name || null,
        stackWebhook: stackWebhook?.name || null,
      });

      res.json({
        success: true,
        message: 'Update recorded successfully',
      });
    } catch (error) {
      // Check if this is a duplicate (UNIQUE constraint on image + container_name + digest)
      if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
        console.log('Duplicate update ignored (already pending)');
        // Return 200 to signal successful processing even though it was a duplicate
        res.json({
          success: true,
          message: 'Update already pending',
        });
        return;
      }
      // Re-throw non-duplicate errors
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
