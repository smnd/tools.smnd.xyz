/**
 * @file Direct webhook triggering API
 *
 * This module provides a utility endpoint for manually triggering any Portainer
 * webhook URL directly. Useful for:
 * - Testing webhook connectivity
 * - Manually triggering webhooks outside the update flow
 * - Debugging webhook issues
 *
 * Responsibilities:
 * - Validate webhook URL format
 * - Make POST requests to webhook URLs
 * - Handle SSL certificate validation (disabled for self-signed certs)
 * - Log webhook trigger results
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticatePin } from '../middleware/auth.js';

const router: ExpressRouter = Router();

/**
 * Trigger a Portainer webhook by making a POST request to its URL
 *
 * Features:
 * - Disables SSL certificate validation for self-signed certificates
 *   (needed for NAS devices that use self-signed certs)
 * - Logs all webhook attempts and results
 * - Returns both success and error information
 *
 * Why SSL validation is disabled:
 * Many NAS devices and home lab setups use self-signed certificates for HTTPS.
 * Portainer typically runs with such certificates. Disabling validation allows
 * the backend to communicate with these Portainer instances while still using HTTPS.
 * This is not a security issue for an internal service.
 *
 * @param {string} webhookUrl - Full Portainer webhook URL to trigger (must be HTTPS or HTTP)
 * @returns {Promise<{success: boolean, error?: string}>} Result object
 *   - success: true if webhook returned 2xx status
 *   - error: Error message if failed (HTTP status or network error)
 *
 * @example
 * const result = await triggerWebhook('https://portainer/webhook/123abc')
 * if (result.success) {
 *   console.log('Webhook triggered successfully')
 * } else {
 *   console.log(`Webhook failed: ${result.error}`)
 * }
 */
async function triggerWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Triggering webhook: ${webhookUrl}`);

    // Set up fetch options with POST method and JSON content type
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // For HTTPS URLs, disable certificate validation
    // This is needed for self-signed certificates on NAS devices and home labs
    if (webhookUrl.startsWith('https://')) {
      const https = await import('https');
      (fetchOptions as any).agent = new https.Agent({
        // rejectUnauthorized: false disables certificate validation
        // Allows connecting to servers with self-signed certificates
        rejectUnauthorized: false,
      });
    }

    // Make the POST request to the webhook URL
    const response = await fetch(webhookUrl, fetchOptions);

    console.log(`Webhook response: ${response.status} ${response.statusText}`);

    // Check if response status is 2xx (200-299)
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
    // Catch network errors, timeout errors, etc.
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Webhook error: ${errorMsg}`, error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * POST / - Manually trigger a webhook URL directly
 *
 * This endpoint allows manual triggering of any Portainer webhook URL for testing
 * and debugging. It's useful for:
 * - Testing webhook connectivity
 * - Verifying webhook functionality
 * - Manual deployments outside the update flow
 *
 * Request body must include:
 * - webhook_url (string): Full HTTPS/HTTP URL to trigger
 *
 * @route POST /api/trigger-webhook
 * @authentication Required - PIN-based Bearer token authentication
 *
 * @param {Object} req.body
 * @param {string} req.body.webhook_url - Portainer webhook URL to trigger
 *
 * @returns {Object} JSON response with trigger result
 *
 * @example
 * POST /api/trigger-webhook
 * Authorization: Bearer {pinHash}
 * Content-Type: application/json
 *
 * {
 *   "webhook_url": "https://portainer.example.com/api/webhooks/123abc"
 * }
 *
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Webhook triggered successfully"
 * }
 *
 * @response 400 - Missing webhook_url or invalid URL format
 * @response 401 - Missing or invalid Authorization header
 * @response 403 - Invalid PIN
 * @response 500 - Failed to trigger webhook (network error or non-2xx response)
 */
router.post('/', authenticatePin, async (req: Request, res: Response) => {
  try {
    // Extract webhook_url from request body
    const { webhook_url } = req.body as { webhook_url?: string };

    // Check that webhook_url parameter is provided
    if (!webhook_url) {
      res.status(400).json({ error: 'webhook_url is required' });
      return;
    }

    // Validate that webhook_url is a valid URL (HTTPS or HTTP)
    try {
      new URL(webhook_url);
    } catch {
      res.status(400).json({ error: 'Invalid webhook URL' });
      return;
    }

    console.log(`Manual webhook trigger requested for: ${webhook_url}`);

    // Trigger the webhook using the helper function
    const result = await triggerWebhook(webhook_url);

    // Return response based on trigger result
    if (result.success) {
      res.json({
        success: true,
        message: 'Webhook triggered successfully',
      });
    } else {
      // Return 500 and include the error message for debugging
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
