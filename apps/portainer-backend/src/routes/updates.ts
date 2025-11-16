import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { statements, Update } from '../models/database.js';
import { authenticatePin } from '../middleware/auth.js';
import { UpdateResponse, TriggerResponse } from '../utils/types.js';

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

// Helper to convert DB row to API response
function mapUpdateToResponse(update: Update): UpdateResponse {
  return {
    id: update.id,
    image: update.image,
    containerName: update.container_name,
    containerId: update.container_id,
    stack: update.stack,
    currentDigest: update.current_digest,
    newDigest: update.new_digest,
    detectedAt: update.detected_at,
    status: update.status,
    webhookUrl: update.webhook_url,
    stackWebhookUrl: update.stack_webhook_url,
    metadata: update.metadata ? JSON.parse(update.metadata) : null,
  };
}

// GET /api/updates - List all pending updates
router.get('/', authenticatePin, (_req: Request, res: Response) => {
  try {
    const updates = statements.getPendingUpdates.all() as Update[];
    console.log(`Found ${updates.length} pending updates:`, updates);
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

// POST /api/updates/:id/trigger - Trigger single update
router.post('/:id/trigger', authenticatePin, async (req: Request, res: Response) => {
  try {
    const updateId = parseInt(req.params.id);

    if (isNaN(updateId)) {
      res.status(400).json({ error: 'Invalid update ID' });
      return;
    }

    // Get update
    const update = statements.getUpdateById.get(updateId) as Update | undefined;

    if (!update) {
      res.status(404).json({ error: 'Update not found' });
      return;
    }

    if (!update.webhook_url) {
      res.status(400).json({ error: 'No webhook URL configured for this update' });
      return;
    }

    // Update status to 'updating'
    statements.updateStatus.run('updating', updateId);

    // Create history record
    const historyResult = statements.insertHistory.run(
      updateId,
      update.image,
      update.container_name,
      update.stack,
      'triggered',
      update.webhook_url
    );
    const historyId = historyResult.lastInsertRowid as number;

    // Trigger webhook
    const result = await triggerWebhook(update.webhook_url);

    if (result.success) {
      // Mark as completed
      statements.updateStatus.run('completed', updateId);
      statements.updateHistoryStatus.run('completed', null, historyId);

      const response: TriggerResponse = {
        success: true,
        message: 'Update triggered successfully',
        historyId,
      };
      res.json(response);
    } else {
      // Mark as failed
      statements.updateStatus.run('failed', updateId);
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

// POST /api/updates/batch - Trigger multiple updates
router.post('/batch', authenticatePin, async (req: Request, res: Response) => {
  try {
    const { updateIds } = req.body as { updateIds?: number[] };

    if (!Array.isArray(updateIds) || updateIds.length === 0) {
      res.status(400).json({ error: 'updateIds must be a non-empty array' });
      return;
    }

    const results: Array<{ id: number; success: boolean; error?: string }> = [];

    for (const updateId of updateIds) {
      const update = statements.getUpdateById.get(updateId) as Update | undefined;

      if (!update) {
        results.push({ id: updateId, success: false, error: 'Update not found' });
        continue;
      }

      if (!update.webhook_url) {
        results.push({ id: updateId, success: false, error: 'No webhook URL' });
        continue;
      }

      // Update status to 'updating'
      statements.updateStatus.run('updating', updateId);

      // Create history record
      const historyResult = statements.insertHistory.run(
        updateId,
        update.image,
        update.container_name,
        update.stack,
        'triggered',
        update.webhook_url
      );
      const historyId = historyResult.lastInsertRowid as number;

      // Trigger webhook
      const result = await triggerWebhook(update.webhook_url);

      if (result.success) {
        statements.updateStatus.run('completed', updateId);
        statements.updateHistoryStatus.run('completed', null, historyId);
        results.push({ id: updateId, success: true });
      } else {
        statements.updateStatus.run('failed', updateId);
        statements.updateHistoryStatus.run('failed', result.error || 'Unknown error', historyId);
        results.push({ id: updateId, success: false, error: result.error });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: failureCount === 0,
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

// DELETE /api/updates/:id - Dismiss/clear an update
router.delete('/:id', authenticatePin, (req: Request, res: Response) => {
  try {
    const updateId = parseInt(req.params.id);

    if (isNaN(updateId)) {
      res.status(400).json({ error: 'Invalid update ID' });
      return;
    }

    const result = statements.deleteUpdate.run(updateId);

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

// POST /api/updates/stack/:stackName/trigger - Trigger stack-level webhook
router.post('/stack/:stackName/trigger', authenticatePin, async (req: Request, res: Response) => {
  try {
    const stackName = req.params.stackName;

    if (!stackName) {
      res.status(400).json({ error: 'Stack name is required' });
      return;
    }

    // Find any update in this stack to get the stack webhook URL
    const updates = statements.getPendingUpdates.all() as Update[];
    const stackUpdate = updates.find(u => u.stack === stackName);

    if (!stackUpdate) {
      res.status(404).json({ error: 'No pending updates found for this stack' });
      return;
    }

    if (!stackUpdate.stack_webhook_url) {
      res.status(400).json({ error: 'No stack webhook URL configured for this stack' });
      return;
    }

    console.log(`Triggering stack webhook for: ${stackName}`);

    // Trigger the stack webhook
    const result = await triggerWebhook(stackUpdate.stack_webhook_url);

    if (result.success) {
      // Mark all updates in this stack as completed
      for (const update of updates.filter(u => u.stack === stackName)) {
        statements.updateStatus.run('completed', update.id);

        // Create history record
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
