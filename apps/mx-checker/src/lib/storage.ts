const STORAGE_KEY = 'qr-code-payload'

/**
 * Save payload to localStorage
 */
export function savePayload(payload: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, payload)
  } catch (error) {
    console.error('Failed to save payload to localStorage:', error)
  }
}

/**
 * Load payload from localStorage
 */
export function loadPayload(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch (error) {
    console.error('Failed to load payload from localStorage:', error)
    return ''
  }
}

/**
 * Clear payload from localStorage
 */
export function clearPayload(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear payload from localStorage:', error)
  }
}
