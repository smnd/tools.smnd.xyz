import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { statements, Update } from '../models/database.js';
import { authenticatePin } from '../middleware/auth.js';
import { UpdateResponse, TriggerResponse } from '../utils/types.js';

const router: ExpressRouter = Router();

// Helper to trigger a Portainer webhook
async function triggerWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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
    metadata: update.metadata ? JSON.parse(update.metadata) : null,
  };
}

// GET /api/updates - List all pending updates
router.get('/', authenticatePin, (_req: Request, res: Response) => {
  try {
    const updates = statements.getPendingUpdates.all() as Update[];
    const response = updates.map(mapUpdateToResponse);

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

export default router;
