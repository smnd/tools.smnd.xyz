import type { Update, PaginatedHistory, TriggerResponse, BatchTriggerResponse } from './types'

export class ApiClient {
  private baseUrl: string
  private pinHash: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setPinHash(hash: string) {
    this.pinHash = hash
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers as Record<string, string>,
    }

    if (this.pinHash) {
      headers['Authorization'] = `Bearer ${this.pinHash}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Get all pending updates
  async getUpdates(): Promise<Update[]> {
    return this.request<Update[]>('/api/updates')
  }

  // Trigger a single update
  async triggerUpdate(updateId: number): Promise<TriggerResponse> {
    return this.request<TriggerResponse>(`/api/updates/${updateId}/trigger`, {
      method: 'POST',
    })
  }

  // Trigger multiple updates
  async triggerBatch(updateIds: number[]): Promise<BatchTriggerResponse> {
    return this.request<BatchTriggerResponse>('/api/updates/batch', {
      method: 'POST',
      body: JSON.stringify({ updateIds }),
    })
  }

  // Trigger any webhook URL directly (for manual webhooks)
  async triggerWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/trigger-webhook', {
      method: 'POST',
      body: JSON.stringify({ webhook_url: webhookUrl }),
    })
  }

  // Dismiss an update
  async dismissUpdate(updateId: number): Promise<void> {
    await this.request<void>(`/api/updates/${updateId}`, {
      method: 'DELETE',
    })
  }

  // Get update history
  async getHistory(page: number = 1, pageSize: number = 20): Promise<PaginatedHistory> {
    return this.request<PaginatedHistory>(`/api/history?page=${page}&pageSize=${pageSize}`)
  }
}
