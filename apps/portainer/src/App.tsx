import { useEffect, useState } from 'react'
import { ThemeToggle, Footer, getStoredTheme, setStoredTheme, applyTheme, watchSystemTheme, type Theme, Button, Input } from '@tools/ui'
import { Search, RefreshCw, Lock, CheckCircle2, XCircle, Container, Layers } from 'lucide-react'
import './App.css'

interface Webhook {
  name: string
  type: 'stack' | 'container'
  url: string
}

interface Config {
  pin: string
  webhooks: Webhook[]
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

// SHA-256 hash function
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function App() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme())
  const [config, setConfig] = useState<Config | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingWebhooks, setLoadingWebhooks] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [configError, setConfigError] = useState<string | null>(null)

  // Initialize and manage theme
  useEffect(() => {
    applyTheme(theme)
    setStoredTheme(theme)

    if (theme === 'auto') {
      const unwatch = watchSystemTheme(() => applyTheme('auto'))
      return unwatch
    }
  }, [theme])

  // Load config on mount
  useEffect(() => {
    fetch('/config.json')
      .then(res => {
        if (!res.ok) {
          throw new Error('Config file not found. Make sure config.json exists in the public folder.')
        }
        return res.json()
      })
      .then(data => setConfig(data))
      .catch(err => {
        console.error('Failed to load config:', err)
        setConfigError(err.message)
      })
  }, [])

  // Check session authentication on mount
  useEffect(() => {
    const authed = sessionStorage.getItem('portainer_authed')
    if (authed === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  // Toast management
  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    const hashedPin = await sha256(pinInput)
    if (hashedPin === config.pin) {
      setIsAuthenticated(true)
      sessionStorage.setItem('portainer_authed', 'true')
      setPinInput('')
    } else {
      addToast('Incorrect PIN', 'error')
      setPinInput('')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('portainer_authed')
    setPinInput('')
  }

  const triggerWebhook = async (webhook: Webhook) => {
    setLoadingWebhooks(prev => new Set(prev).add(webhook.url))

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
      })

      if (response.ok) {
        addToast(`✓ ${webhook.name} update triggered`, 'success')
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      addToast(`✗ Failed to trigger ${webhook.name}: ${error}`, 'error')
    } finally {
      setLoadingWebhooks(prev => {
        const next = new Set(prev)
        next.delete(webhook.url)
        return next
      })
    }
  }

  const filteredWebhooks = config?.webhooks.filter(webhook =>
    webhook.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  // Config error screen
  if (configError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  Portainer Updater
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Trigger stack and container updates via webhooks
                </p>
              </div>
              <div className="flex-shrink-0">
                <ThemeToggle theme={theme} onThemeChange={setTheme} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto p-4 md:p-6 w-full flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-6 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configuration Error</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{configError}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Please ensure <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">config.json</code> exists in the <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">public/</code> folder.
            </p>
          </div>
        </main>

        <Footer version="v1.0.0" />
      </div>
    )
  }

  // Loading screen
  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Loading configuration...</p>
        </div>
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  Portainer Updater
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Trigger stack and container updates via webhooks
                </p>
              </div>
              <div className="flex-shrink-0">
                <ThemeToggle theme={theme} onThemeChange={setTheme} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto p-4 md:p-6 w-full flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 w-full max-w-md">
            <div className="flex items-center justify-center mb-6">
              <Lock className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Authentication Required
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Enter your PIN to access webhook triggers
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">
                Unlock
              </Button>
            </form>
          </div>
        </main>

        <Footer version="v1.0.0" />
      </div>
    )
  }

  // Main app screen
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Portainer Updater
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {config.webhooks.length} webhook{config.webhooks.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Lock
              </Button>
              <ThemeToggle theme={theme} onThemeChange={setTheme} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto p-4 md:p-6 w-full">
        {/* Search */}
        {config.webhooks.length > 5 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search webhooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Webhook List */}
        <div className="space-y-3">
          {filteredWebhooks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No webhooks match your search' : 'No webhooks configured'}
              </p>
            </div>
          ) : (
            filteredWebhooks.map((webhook) => (
              <div
                key={webhook.url}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {webhook.type === 'stack' ? (
                      <Layers className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Container className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                      {webhook.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {webhook.type}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => triggerWebhook(webhook)}
                  disabled={loadingWebhooks.has(webhook.url)}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {loadingWebhooks.has(webhook.url) ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Update
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </main>

      <Footer version="v1.0.0" />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            } animate-in slide-in-from-right`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
