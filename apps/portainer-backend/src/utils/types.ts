/**
 * @file Type definitions and Zod schemas for API contracts and validation
 *
 * This module provides:
 * - Zod schemas for validating external webhook payloads
 * - TypeScript interfaces for API request/response contracts
 * - Type inference from Zod schemas
 *
 * Using Zod allows runtime validation while also generating TypeScript types,
 * ensuring API contracts are enforced both at compile-time and runtime.
 */

import { z } from 'zod';

/**
 * Zod schema for validating Diun webhook payloads
 *
 * Diun (Docker Image Update Notifier) sends webhook notifications when
 * new image versions are available. This schema validates the payload structure
 * and ensures required fields are present.
 *
 * Field descriptions:
 * - image: Docker image reference (required, e.g., 'myregistry/myapp')
 * - digest: Image digest hash (required, e.g., 'sha256:abc123...')
 * - metadata.ctn_id: Container ID running this image
 * - metadata.ctn_names: Container name(s)
 * - metadata.ctn_state: Container state (running, exited, etc.)
 * - metadata.ctn_status: Container status string
 * - Other fields: Optional metadata from Diun about the image
 *
 * @example
 * const result = DiunWebhookSchema.safeParse(req.body)
 * if (result.success) {
 *   const webhook: DiunWebhook = result.data
 *   // Process webhook...
 * } else {
 *   // Handle validation error
 * }
 */
export const DiunWebhookSchema = z.object({
  /** Diun version that sent this webhook */
  diun_version: z.string().optional(),

  /** Hostname of the Diun instance */
  hostname: z.string().optional(),

  /** Status of the image (e.g., 'new' for newly available update) */
  status: z.string().optional(),

  /** Image registry/provider (e.g., 'docker', 'ghcr', etc.) */
  provider: z.string().optional(),

  /** Docker image reference - REQUIRED (e.g., 'myregistry/myapp:latest') */
  image: z.string(),

  /** Link to the hub/registry page for this image */
  hub_link: z.string().optional(),

  /** MIME type of the image */
  mime_type: z.string().optional(),

  /** Image digest hash - REQUIRED (e.g., 'sha256:abc123...') */
  digest: z.string(),

  /** Timestamp when image was created */
  created: z.string().optional(),

  /** CPU architecture the image is built for (e.g., 'amd64', 'arm64') */
  platform: z.string().optional(),

  /** Container metadata - information about containers running this image */
  metadata: z.object({
    /** Docker container ID */
    ctn_id: z.string().optional(),

    /** Container name(s) */
    ctn_names: z.string().optional(),

    /** Container command/entrypoint */
    ctn_command: z.string().optional(),

    /** Container state (running, exited, etc.) */
    ctn_state: z.string().optional(),

    /** Container status string */
    ctn_status: z.string().optional(),

    /** Container size in bytes */
    ctn_size: z.string().optional(),

    /** Container creation timestamp */
    ctn_createdat: z.string().optional(),
  }).nullish(), // metadata can be null or undefined
});

/** Type inferred from DiunWebhookSchema - use this for type-safe webhook handling */
export type DiunWebhook = z.infer<typeof DiunWebhookSchema>;

// ============================================================================
// API REQUEST TYPES
// ============================================================================

/**
 * Request body for triggering a single update
 * @route POST /api/updates/:id/trigger
 */
export interface TriggerUpdateRequest {
  /** The update ID to trigger */
  updateId: number;
}

/**
 * Request body for batch triggering multiple updates
 * @route POST /api/updates/batch
 */
export interface BatchTriggerRequest {
  /** Array of update IDs to trigger */
  updateIds: number[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard response for webhook trigger operations
 *
 * Used by all endpoints that trigger webhooks to indicate success/failure.
 * The historyId is provided so the client can track the update in history.
 *
 * @example
 * {
 *   "success": true,
 *   "message": "Update triggered successfully",
 *   "historyId": 42
 * }
 */
export interface TriggerResponse {
  /** Whether the webhook trigger was successful */
  success: boolean;

  /** Human-readable status message */
  message: string;

  /** ID of the created history record (for tracking) - only set if successful */
  historyId?: number;
}

/**
 * API representation of an Update record
 *
 * This is the response format for update queries. Note that:
 * - Database field names are snake_case (container_name, webhook_url)
 * - API response field names are camelCase (containerName, webhookUrl)
 * - Metadata is parsed from JSON string to object
 *
 * @example
 * {
 *   "id": 1,
 *   "image": "myapp:latest",
 *   "containerName": "myapp-prod",
 *   "status": "pending",
 *   "detectedAt": "2024-01-15T10:30:00Z",
 *   "webhookUrl": "https://portainer/webhook",
 *   "metadata": { "ctn_state": "running" }
 * }
 */
export interface UpdateResponse {
  /** Unique update identifier */
  id: number;

  /** Docker image name */
  image: string;

  /** Container name (camelCase format) */
  containerName: string | null;

  /** Container ID (camelCase format) */
  containerId: string | null;

  /** Portainer stack name */
  stack: string | null;

  /** Current image digest (camelCase format) */
  currentDigest: string | null;

  /** New available image digest (camelCase format) */
  newDigest: string;

  /** Detection timestamp (camelCase format) */
  detectedAt: string;

  /** Update status: 'pending' | 'updating' | 'completed' | 'failed' */
  status: string;

  /** Container webhook URL (camelCase format) */
  webhookUrl: string | null;

  /** Stack webhook URL (camelCase format) */
  stackWebhookUrl: string | null;

  /** Parsed metadata object from Diun */
  metadata: Record<string, unknown> | null;
}

/**
 * API representation of a history record (audit log entry)
 *
 * Similar to UpdateResponse, this converts database field names (snake_case)
 * to API format (camelCase).
 *
 * @example
 * {
 *   "id": 42,
 *   "updateId": 1,
 *   "image": "myapp:latest",
 *   "containerName": "myapp-prod",
 *   "triggeredAt": "2024-01-15T10:35:00Z",
 *   "completedAt": "2024-01-15T10:35:05Z",
 *   "status": "completed",
 *   "webhookUrl": "https://portainer/webhook"
 * }
 */
export interface HistoryResponse {
  /** Unique history record identifier */
  id: number;

  /** Reference to the update ID (camelCase format) */
  updateId: number | null;

  /** Docker image name */
  image: string;

  /** Container name (camelCase format) */
  containerName: string | null;

  /** Stack name */
  stack: string | null;

  /** Timestamp when webhook was triggered (camelCase format) */
  triggeredAt: string;

  /** Timestamp when webhook completed (camelCase format) - null if still running */
  completedAt: string | null;

  /** Webhook result: 'triggered' | 'completed' | 'failed' */
  status: string;

  /** Error message if webhook failed (camelCase format) */
  errorMessage: string | null;

  /** Webhook URL that was triggered (camelCase format) */
  webhookUrl: string | null;
}

/**
 * Paginated response for history queries
 *
 * Used by the GET /api/history endpoint to return paginated results
 * with metadata about the pagination state.
 *
 * @example
 * {
 *   "items": [...],
 *   "total": 150,
 *   "page": 2,
 *   "pageSize": 20,
 *   "totalPages": 8
 * }
 */
export interface PaginatedHistoryResponse {
  /** Array of history records for this page */
  items: HistoryResponse[];

  /** Total number of history records across all pages */
  total: number;

  /** Current page number (1-indexed) */
  page: number;

  /** Number of records per page */
  pageSize: number;

  /** Total number of pages */
  totalPages: number;
}
