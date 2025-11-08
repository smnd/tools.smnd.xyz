/**
 * Theme utilities for managing light/dark/auto themes
 */

export type Theme = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'theme'

/**
 * Get the theme from localStorage, fallback to 'auto'
 */
export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'auto'

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }
  return 'auto'
}

/**
 * Save theme to localStorage
 */
export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, theme)
}

/**
 * Get the system theme preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/**
 * Apply theme to the document
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return

  const root = document.documentElement

  if (theme === 'auto') {
    const systemTheme = getSystemTheme()
    root.classList.remove('light', 'dark')
    root.classList.add(systemTheme)
  } else {
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }
}

/**
 * Watch for system theme changes and call callback when it changes
 * Returns a function to stop watching
 */
export function watchSystemTheme(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handler = () => callback()
  mediaQuery.addEventListener('change', handler)

  return () => mediaQuery.removeEventListener('change', handler)
}
