import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticatePin } from '../middleware/auth.js';

const router: ExpressRouter = Router();

// Helper to trigger a Portainer webhook
async function triggerWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Triggering webhook: ${webhookUrl}`);

    // For HTTPS URLs with self-signed certificates, disable certificate validation
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Disable certificate validation for HTTPS (needed for self-signed certs on NAS)
    if (webhookUrl.startsWith('https://')) {
      const https = await import('https');
      (fetchOptions as any).agent = new https.Agent({
        rejectUnauthorized: false,
      });
    }

    const response = await fetch(webhookUrl, fetchOptions);

    console.log(`Webhook response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      console.error(`Webhook failed: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }

    console.log('Webhook triggered successfully');
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Webhook error: ${errorMsg}`, error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

// POST /api/trigger-webhook - Trigger any webhook URL directly
router.post('/', authenticatePin, async (req: Request, res: Response) => {
  try {
    const { webhook_url } = req.body as { webhook_url?: string };

    if (!webhook_url) {
      res.status(400).json({ error: 'webhook_url is required' });
      return;
    }

    // Basic URL validation
    try {
      new URL(webhook_url);
    } catch {
      res.status(400).json({ error: 'Invalid webhook URL' });
      return;
    }

    console.log(`Manual webhook trigger requested for: ${webhook_url}`);

    // Trigger the webhook
    const result = await triggerWebhook(webhook_url);

    if (result.success) {
      res.json({
        success: true,
        message: 'Webhook triggered successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to trigger webhook',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error triggering manual webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
