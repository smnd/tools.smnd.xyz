/**
 * @file Update history and audit log API
 *
 * This module provides an authenticated endpoint to retrieve the update history
 * (audit log) of all triggered updates. The history is immutable and tracks
 * what was triggered, when, and whether it succeeded or failed.
 *
 * Responsibilities:
 * - Retrieve paginated update history from the database
 * - Convert database format (snake_case) to API format (camelCase)
 * - Validate pagination parameters
 * - Return paginated response with metadata
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { statements, UpdateHistory } from '../models/database.js';
import { authenticatePin } from '../middleware/auth.js';
import { HistoryResponse, PaginatedHistoryResponse } from '../utils/types.js';

const router: ExpressRouter = Router();

/**
 * Convert a database UpdateHistory record to API response format
 *
 * Maps snake_case database field names to camelCase API format for consistency.
 * All fields are passed through unchanged - only the key names change.
 *
 * @param {UpdateHistory} history - Raw history record from database
 * @returns {HistoryResponse} History record in API format
 *
 * @example
 * const dbRecord = { id: 1, update_id: 42, triggered_at: "2024-01-15..." }
 * const apiRecord = mapHistoryToResponse(dbRecord)
 * // apiRecord = { id: 1, updateId: 42, triggeredAt: "2024-01-15..." }
 */
function mapHistoryToResponse(history: UpdateHistory): HistoryResponse {
  return {
    // Keep ID as-is (already camelCase)
    id: history.id,

    // Convert snake_case to camelCase
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

/**
 * GET / - Retrieve paginated update history with audit log
 *
 * Returns a paginated list of all triggered updates in reverse chronological order
 * (newest first). Used for viewing the history of what updates were triggered,
 * when they were triggered, and whether they succeeded.
 *
 * Pagination parameters:
 * - page: Page number (1-indexed, default 1)
 * - pageSize: Records per page (default 20, max 100)
 *
 * The maximum pageSize is capped at 100 to prevent resource exhaustion.
 *
 * @route GET /api/history?page=1&pageSize=20
 * @authentication Required - PIN-based Bearer token authentication
 *
 * @param {number} req.query.page - Page number (1-indexed, default 1)
 * @param {number} req.query.pageSize - Records per page (default 20, max 100)
 *
 * @returns {PaginatedHistoryResponse} Paginated history records with metadata
 *
 * @example
 * GET /api/history?page=1&pageSize=20
 * Authorization: Bearer {pinHash}
 *
 * Response (200 OK):
 * {
 *   "items": [
 *     {
 *       "id": 42,
 *       "updateId": 1,
 *       "image": "myapp:latest",
 *       "status": "completed",
 *       "triggeredAt": "2024-01-15T10:35:00Z",
 *       "completedAt": "2024-01-15T10:35:05Z",
 *       "webhookUrl": "https://portainer/webhook"
 *     }
 *   ],
 *   "total": 150,
 *   "page": 1,
 *   "pageSize": 20,
 *   "totalPages": 8
 * }
 *
 * @response 400 - Invalid pagination parameters (page < 1 or pageSize > 100)
 * @response 401 - Missing or invalid Authorization header
 * @response 403 - Invalid PIN
 * @response 500 - Internal server error
 */
router.get('/', authenticatePin, (req: Request, res: Response) => {
  try {
    // Extract pagination parameters from query string with defaults
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    // Validate pagination parameters
    // page must be >= 1, pageSize must be >= 1 and <= 100 (to prevent abuse)
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      res.status(400).json({ error: 'Invalid pagination parameters' });
      return;
    }

    // Calculate database offset from page number
    // offset = (page - 1) * pageSize
    // Page 1 = offset 0, Page 2 = offset 20 (with pageSize=20), etc.
    const offset = (page - 1) * pageSize;

    // Get total count of history records (for pagination metadata)
    const countResult = statements.getHistoryCount.get() as { count: number };
    const total = countResult.count;

    // Fetch paginated history records (newest first due to ORDER BY triggered_at DESC)
    const history = statements.getHistory.all(pageSize, offset) as UpdateHistory[];

    // Convert each history record from database format to API format
    const items = history.map(mapHistoryToResponse);

    // Build the paginated response with all metadata
    const response: PaginatedHistoryResponse = {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize), // Round up to handle partial pages
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
