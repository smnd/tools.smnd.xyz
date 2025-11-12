import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { statements, UpdateHistory } from '../models/database.js';
import { authenticatePin } from '../middleware/auth.js';
import { HistoryResponse, PaginatedHistoryResponse } from '../utils/types.js';

const router: ExpressRouter = Router();

// Helper to convert DB row to API response
function mapHistoryToResponse(history: UpdateHistory): HistoryResponse {
  return {
    id: history.id,
    updateId: history.update_id,
    image: history.image,
    containerName: history.container_name,
    stack: history.stack,
    triggeredAt: history.triggered_at,
    completedAt: history.completed_at,
    status: history.status,
    errorMessage: history.error_message,
    webhookUrl: history.webhook_url,
  };
}

// GET /api/history - Get update history with pagination
router.get('/', authenticatePin, (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    if (page < 1 || pageSize < 1 || pageSize > 100) {
      res.status(400).json({ error: 'Invalid pagination parameters' });
      return;
    }

    const offset = (page - 1) * pageSize;

    // Get total count
    const countResult = statements.getHistoryCount.get() as { count: number };
    const total = countResult.count;

    // Get paginated history
    const history = statements.getHistory.all(pageSize, offset) as UpdateHistory[];
    const items = history.map(mapHistoryToResponse);

    const response: PaginatedHistoryResponse = {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      error: 'Failed to fetch history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
