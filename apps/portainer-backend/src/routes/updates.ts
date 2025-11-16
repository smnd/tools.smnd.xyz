/**
 * @file Update management and triggering API
 *
 * This module provides the core API for:
 * - Listing pending updates
 * - Triggering single or multiple updates
 * - Dismissing updates
 * - Triggering entire stacks at once
 *
 * All endpoints are authenticated with PIN-based Bearer tokens.
 *
 * Responsibilities:
 * - Manage pending update lifecycle (pending → updating → completed/failed)
 * - Trigger Portainer webhooks at container and stack levels
 * - Create audit log entries for all triggered updates
 * - Handle webhook failures gracefully
 * - Convert database format to API format
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { statements, Update } from '../models/database.js';
import { authenticatePin } from '../middleware/auth.js';
import { UpdateResponse, TriggerResponse } from '../utils/types.js';

const router: ExpressRouter = Router();

/**
 * Trigger a Portainer webhook by making a POST request to its URL
 *
 * Features:
 * - Disables SSL certificate validation for self-signed certificates
 * - Logs all webhook attempts and results
 * - Returns both success and error information
 *
 * @param {string} webhookUrl - Full Portainer webhook URL to trigger
 * @returns {Promise<{success: boolean, error?: string}>} Result object
 *
 * @example
 * const result = await triggerWebhook('https://portainer/webhook/123')
 * if (result.success) {
 *   console.log('Webhook triggered successfully')
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

    // For HTTPS URLs, disable certificate validation for self-signed certificates
    // This is needed for NAS devices and home labs that use self-signed certs
    if (webhookUrl.startsWith('https://')) {
      const https = await import('https');
      (fetchOptions as any).agent = new https.Agent({
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
 * Convert a database Update record to API response format
 *
 * Maps snake_case database field names to camelCase API format.
 * Also parses JSON metadata string to JavaScript object.
 *
 * @param {Update} update - Raw update record from database
 * @returns {UpdateResponse} Update record in API format
 *
 * @example
 * const dbRecord = { id: 1, container_name: "myapp", webhook_url: "..." }
 * const apiRecord = mapUpdateToResponse(dbRecord)
 * // apiRecord = { id: 1, containerName: "myapp", webhookUrl: "..." }
 */
function mapUpdateToResponse(update: Update): UpdateResponse {
  return {
    // Keep ID as-is (already camelCase)
    id: update.id,
    image: update.image,

    // Convert snake_case to camelCase for all fields
    containerName: update.container_name,
    containerId: update.container_id,
    stack: update.stack,
    currentDigest: update.current_digest,
    newDigest: update.new_digest,
    detectedAt: update.detected_at,
    status: update.status,
    webhookUrl: update.webhook_url,
    stackWebhookUrl: update.stack_webhook_url,

    // Parse metadata from JSON string to object (null if not present)
    metadata: update.metadata ? JSON.parse(update.metadata) : null,
  };
}

/**
 * GET / - List all pending Docker image updates
 *
 * Returns an array of all pending updates detected by Diun that are waiting
 * to be triggered. Updates are ordered by stack, container name, and detection time.
 *
 * @route GET /api/updates
 * @authentication Required - PIN-based Bearer token authentication
 *
 * @returns {UpdateResponse[]} Array of pending updates
 *
 * @example
 * GET /api/updates
 * Authorization: Bearer {pinHash}
 *
 * Response (200 OK):
 * [
 *   {
 *     "id": 1,
 *     "image": "myapp:latest",
 *     "containerName": "myapp-prod",
 *     "status": "pending",
 *     "webhookUrl": "https://portainer/webhook/123",
 *     "detectedAt": "2024-01-15T10:30:00Z"
 *   }
 * ]
 *
 * @response 401 - Missing or invalid Authorization header
 * @response 403 - Invalid PIN
 * @response 500 - Internal server error
 */
router.get('/', authenticatePin, (_req: Request, res: Response) => {
  try {
    // Fetch all pending updates from database (ordered by stack, container, date)
    const updates = statements.getPendingUpdates.all() as Update[];
    console.log(`Found ${updates.length} pending updates:`, updates);

    // Convert each update from database format to API format
    const response = updates.map(mapUpdateToResponse);
    console.log('Mapped response:', response);

    res.json(response);
  } catch (error) {
    console.error('Error fetching updates:', error);
    res.status(500).json({
      error: 'Failed to fetch updates',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /:id/trigger - Trigger a single container update
 *
 * Triggers the container-level Portainer webhook for a specific pending update.
 * This causes Portainer to redeploy the container with the new image.
 *
 * Process:
 * 1. Validate update exists
 * 2. Set update status to 'updating'
 * 3. Create history record
 * 4. Trigger container webhook
 * 5. Update status to 'completed' (success) or 'failed' (error)
 * 6. Update history with result
 *
 * @route POST /api/updates/:id/trigger
 * @authentication Required - PIN-based Bearer token authentication
 *
 * @param {number} req.params.id - Update ID to trigger
 *
 * @returns {TriggerResponse} Response with success status and historyId
 *
 * @example
 * POST /api/updates/1/trigger
 * Authorization: Bearer {pinHash}
 *
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Update triggered successfully",
 *   "historyId": 42
 * }
 *
 * @response 400 - Invalid update ID or no webhook configured
 * @response 401 - Missing or invalid Authorization header
 * @response 403 - Invalid PIN
 * @response 404 - Update not found
 * @response 500 - Failed to trigger webhook
 */
router.post('/:id/trigger', authenticatePin, async (req: Request, res: Response) => {
  try {
    // Parse update ID from URL parameter
    const updateId = parseInt(req.params.id);

    // Validate that ID is a valid number
    if (isNaN(updateId)) {
      res.status(400).json({ error: 'Invalid update ID' });
      return;
    }

    // Fetch the update from database
    const update = statements.getUpdateById.get(updateId) as Update | undefined;

    // Check if update exists
    if (!update) {
      res.status(404).json({ error: 'Update not found' });
      return;
    }

    // Check if webhook URL is configured for this update
    if (!update.webhook_url) {
      res.status(400).json({ error: 'No webhook URL configured for this update' });
      return;
    }

    // Update status to 'updating' to indicate we're processing this update
    statements.updateStatus.run('updating', updateId);

    // Create audit log entry with initial 'triggered' status
    const historyResult = statements.insertHistory.run(
      updateId,
      update.image,
      update.container_name,
      update.stack,
      'triggered',
      update.webhook_url
    );
    const historyId = historyResult.lastInsertRowid as number;

    // Trigger the container-level Portainer webhook
    const result = await triggerWebhook(update.webhook_url);

    // Handle webhook result
    if (result.success) {
      // Mark update as completed
      statements.updateStatus.run('completed', updateId);
      // Mark history entry as completed
      statements.updateHistoryStatus.run('completed', null, historyId);

      const response: TriggerResponse = {
        success: true,
        message: 'Update triggered successfully',
        historyId,
      };
      res.json(response);
    } else {
      // Mark update as failed
      statements.updateStatus.run('failed', updateId);
      // Mark history entry as failed with error message
      statements.updateHistoryStatus.run('failed', result.error || 'Unknown error', historyId);

      res.status(500).json({
        success: false,
        message: 'Failed to trigger update',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error triggering update:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /batch - Trigger multiple updates in a batch operation
 *
 * Processes multiple updates sequentially, triggering each container webhook.
 * Returns detailed results for each update, allowing partial success/failure.
 *
 * Process for each update:
 * 1. Validate update exists and has webhook URL
 * 2. Set status to 'updating'
 * 3. Create history record
 * 4. Trigger webhook
 * 5. Set status to 'completed' or 'failed' based on result
 * 6. Update history with result
 *
 * @route POST /api/updates/batch
 * @authentication Required - PIN-based Bearer token authentication
 *
 * @param {Object} req.body
 * @param {number[]} req.body.updateIds - Array of update IDs to trigger
 *
 * @returns {Object} Batch response with per-update results and summary
 *
 * @example
 * POST /api/updates/batch
 * Authorization: Bearer {pinHash}
 * Content-Type: application/json
 *
 * {
 *   "updateIds": [1, 2, 3]
 * }
 *
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Triggered 3/3 updates",
 *   "results": [
 *     { "id": 1, "success": true },
 *     { "id": 2, "success": true },
 *     { "id": 3, "success": false, "error": "Webhook timeout" }
 *   ],
 *   "summary": {
 *     "total": 3,
 *     "succeeded": 2,
 *     "failed": 1
 *   }
 * }
 *
 * @response 400 - updateIds is not a non-empty array
 * @response 401 - Missing or invalid Authorization header
 * @response 403 - Invalid PIN
 * @response 500 - Internal server error
 */
router.post('/batch', authenticatePin, async (req: Request, res: Response) => {
  try {
    // Extract updateIds array from request body
    const { updateIds } = req.body as { updateIds?: number[] };

    // Validate that updateIds is a non-empty array
    if (!Array.isArray(updateIds) || updateIds.length === 0) {
      res.status(400).json({ error: 'updateIds must be a non-empty array' });
      return;
    }

    // Array to collect results for each update
    const results: Array<{ id: number; success: boolean; error?: string }> = [];

    // Process each update sequentially
    for (const updateId of updateIds) {
      // Fetch the update from database
      const update = statements.getUpdateById.get(updateId) as Update | undefined;

      // If update doesn't exist, record failure and continue
      if (!update) {
        results.push({ id: updateId, success: false, error: 'Update not found' });
        continue;
      }

      // If no webhook URL configured, record failure and continue
      if (!update.webhook_url) {
        results.push({ id: updateId, success: false, error: 'No webhook URL' });
        continue;
      }

      // Update status to 'updating'
      statements.updateStatus.run('updating', updateId);

      // Create audit log entry
      const historyResult = statements.insertHistory.run(
        updateId,
        update.image,
        update.container_name,
        update.stack,
        'triggered',
        update.webhook_url
      );
      const historyId = historyResult.lastInsertRowid as number;

      // Trigger the webhook
      const result = await triggerWebhook(update.webhook_url);

      // Handle result
      if (result.success) {
        // Mark update as completed
        statements.updateStatus.run('completed', updateId);
        statements.updateHistoryStatus.run('completed', null, historyId);
        results.push({ id: updateId, success: true });
      } else {
        // Mark update as failed
        statements.updateStatus.run('failed', updateId);
        statements.updateHistoryStatus.run('failed', result.error || 'Unknown error', historyId);
        results.push({ id: updateId, success: false, error: result.error });
      }
    }

    // Calculate summary statistics
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    // Return batch results with summary
    res.json({
      success: failureCount === 0, // Overall success only if all succeeded
      message: `Triggered ${successCount}/${results.length} updates`,
      results,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error('Error in batch trigger:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /:id - Dismiss/remove a pending update
 *
 * Removes a pending update from the list. This doesn't trigger any webhook,
 * it simply deletes the update record as if it never happened.
 *
 * Use this to:
 * - Remove updates you don't want to trigger
 * - Clear false positives or unwanted updates
 * - Reset the pending update list
 *
 * @route DELETE /api/updates/:id
 * @authentication Required - PIN-based Bearer token authentication
 *
 * @param {number} req.params.id - Update ID to dismiss
 *
 * @returns {Object} Success response
 *
 * @example
 * DELETE /api/updates/1
 * Authorization: Bearer {pinHash}
 *
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Update dismissed"
 * }
 *
 * @response 400 - Invalid update ID format
 * @response 401 - Missing or invalid Authorization header
 * @response 403 - Invalid PIN
 * @response 404 - Update not found
 * @response 500 - Internal server error
 */
router.delete('/:id', authenticatePin, (req: Request, res: Response) => {
  try {
    // Parse update ID from URL parameter
    const updateId = parseInt(req.params.id);

    // Validate that ID is a valid number
    if (isNaN(updateId)) {
      res.status(400).json({ error: 'Invalid update ID' });
      return;
    }

    // Delete the update from database
    const result = statements.deleteUpdate.run(updateId);

    // Check if any rows were deleted (update existed)
    if (result.changes === 0) {
      res.status(404).json({ error: 'Update not found' });
      return;
    }

    res.json({ success: true, message: 'Update dismissed' });
  } catch (error) {
    console.error('Error deleting update:', error);
    res.status(500).json({
      error: 'Failed to delete update',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /stack/:stackName/trigger - Trigger a stack-level Portainer update
 *
 * Triggers a stack-level webhook that tells Portainer to redeploy an entire stack.
 * This is useful when you want to update multiple containers in a stack at once.
 *
 * Process:
 * 1. Find any pending update in the stack (to get stack webhook URL)
 * 2. Trigger the stack-level webhook
 * 3. Mark ALL updates in the stack as completed
 * 4. Create history records for all updates
 *
 * Note: This endpoint only triggers the webhook ONCE, even if there are multiple
 * pending updates in the stack. It then marks all of them as completed.
 *
 * @route POST /api/updates/stack/:stackName/trigger
 * @authentication Required - PIN-based Bearer token authentication
 *
 * @param {string} req.params.stackName - Portainer stack name to update
 *
 * @returns {TriggerResponse} Response with success status and message
 *
 * @example
 * POST /api/updates/stack/prod-stack/trigger
 * Authorization: Bearer {pinHash}
 *
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Stack prod-stack update triggered successfully"
 * }
 *
 * @response 400 - No stack webhook configured for this stack
 * @response 401 - Missing or invalid Authorization header
 * @response 403 - Invalid PIN
 * @response 404 - No pending updates found for this stack
 * @response 500 - Failed to trigger stack webhook
 */
router.post('/stack/:stackName/trigger', authenticatePin, async (req: Request, res: Response) => {
  try {
    // Extract stack name from URL parameter
    const stackName = req.params.stackName;

    // Validate stack name is provided
    if (!stackName) {
      res.status(400).json({ error: 'Stack name is required' });
      return;
    }

    // Get all pending updates to find one in this stack
    const updates = statements.getPendingUpdates.all() as Update[];

    // Find any update in this stack (to get the stack webhook URL)
    const stackUpdate = updates.find(u => u.stack === stackName);

    // Check if any updates exist for this stack
    if (!stackUpdate) {
      res.status(404).json({ error: 'No pending updates found for this stack' });
      return;
    }

    // Check if stack webhook URL is configured
    if (!stackUpdate.stack_webhook_url) {
      res.status(400).json({ error: 'No stack webhook URL configured for this stack' });
      return;
    }

    console.log(`Triggering stack webhook for: ${stackName}`);

    // Trigger the stack-level webhook (single trigger for entire stack)
    const result = await triggerWebhook(stackUpdate.stack_webhook_url);

    // Handle result
    if (result.success) {
      // Mark ALL updates in this stack as completed
      // This is appropriate because the stack-level webhook updates the entire stack
      for (const update of updates.filter(u => u.stack === stackName)) {
        // Update the update status
        statements.updateStatus.run('completed', update.id);

        // Create history record for each update in the stack
        // (even though we only triggered the webhook once)
        statements.insertHistory.run(
          update.id,
          update.image,
          update.container_name,
          update.stack,
          'completed',
          stackUpdate.stack_webhook_url
        );
      }

      const response: TriggerResponse = {
        success: true,
        message: `Stack ${stackName} update triggered successfully`,
      };
      res.json(response);
    } else {
      // Webhook failed - don't mark updates as completed
      res.status(500).json({
        success: false,
        message: 'Failed to trigger stack webhook',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error triggering stack update:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
