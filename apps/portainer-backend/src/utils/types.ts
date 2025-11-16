import { z } from 'zod';

// Diun webhook payload schema
export const DiunWebhookSchema = z.object({
  diun_version: z.string().optional(),
  hostname: z.string().optional(),
  status: z.string().optional(),
  provider: z.string().optional(),
  image: z.string(),
  hub_link: z.string().optional(),
  mime_type: z.string().optional(),
  digest: z.string(),
  created: z.string().optional(),
  platform: z.string().optional(),
  metadata: z.object({
    ctn_id: z.string().optional(),
    ctn_names: z.string().optional(),
    ctn_command: z.string().optional(),
    ctn_state: z.string().optional(),
    ctn_status: z.string().optional(),
    ctn_size: z.string().optional(),
    ctn_createdat: z.string().optional(),
  }).nullish(),
});

export type DiunWebhook = z.infer<typeof DiunWebhookSchema>;

// API request/response types
export interface TriggerUpdateRequest {
  updateId: number;
}

export interface BatchTriggerRequest {
  updateIds: number[];
}

export interface TriggerResponse {
  success: boolean;
  message: string;
  historyId?: number;
}

export interface UpdateResponse {
  id: number;
  image: string;
  containerName: string | null;
  containerId: string | null;
  stack: string | null;
  currentDigest: string | null;
  newDigest: string;
  detectedAt: string;
  status: string;
  webhookUrl: string | null;
  stackWebhookUrl: string | null;
  metadata: Record<string, unknown> | null;
}

export interface HistoryResponse {
  id: number;
  updateId: number | null;
  image: string;
  containerName: string | null;
  stack: string | null;
  triggeredAt: string;
  completedAt: string | null;
  status: string;
  errorMessage: string | null;
  webhookUrl: string | null;
}

export interface PaginatedHistoryResponse {
  items: HistoryResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
