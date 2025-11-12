// Backend API types
export interface Update {
  id: number
  image: string
  containerName: string | null
  containerId: string | null
  stack: string | null
  currentDigest: string | null
  newDigest: string
  detectedAt: string
  status: 'pending' | 'updating' | 'completed' | 'failed'
  webhookUrl: string | null
  metadata: Record<string, unknown> | null
}

export interface HistoryItem {
  id: number
  updateId: number | null
  image: string
  containerName: string | null
  stack: string | null
  triggeredAt: string
  completedAt: string | null
  status: 'triggered' | 'completed' | 'failed'
  errorMessage: string | null
  webhookUrl: string | null
}

export interface PaginatedHistory {
  items: HistoryItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface TriggerResponse {
  success: boolean
  message: string
  historyId?: number
}

export interface BatchTriggerResponse {
  success: boolean
  message: string
  results: Array<{
    id: number
    success: boolean
    error?: string
  }>
  summary: {
    total: number
    succeeded: number
    failed: number
  }
}

// Grouped updates for stack view
export interface GroupedUpdates {
  stack: string | null
  updates: Update[]
}
