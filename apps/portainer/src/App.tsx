import { useEffect, useState, useMemo } from 'react'
import { ThemeToggle, Footer, getStoredTheme, setStoredTheme, applyTheme, watchSystemTheme, type Theme, Button, Input } from '@tools/ui'
import { Search, RefreshCw, Lock, CheckCircle2, XCircle, Container, Layers, Bell, Clock } from 'lucide-react'
import { ApiClient } from './lib/api'
import { UpdatesList } from './components/UpdatesList'
import { UpdateHistory } from './components/UpdateHistory'
import type { Update } from './lib/types'
import './App.css'

interface Webhook {
  name: string
  type: 'stack' | 'container'
  stack?: string
  image?: string
  container_name?: string
  webhook_url: string
}

interface Config {
  pin: string
  backend_url?: string
  webhooks: Webhook[]
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

// SHA-256 hash function with fallback for non-secure contexts
async function sha256(message: string): Promise<string> {
  // Try crypto.subtle if available (HTTPS or localhost)
  if (crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Fallback for HTTP contexts (pure JS implementation)
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount))
  }

  const utf8 = new TextEncoder().encode(message)
  const msgLength = utf8.length * 8

  // Pad message
  const paddedLength = Math.ceil((msgLength + 65) / 512) * 512
  const padded = new Uint8Array(paddedLength / 8)
  padded.set(utf8)
  padded[utf8.length] = 0x80

  // Append length
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 4, msgLength, false)

  // Process blocks
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]

  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]

  for (let i = 0; i < padded.length; i += 64) {
    const W = new Array(64)
    for (let j = 0; j < 16; j++) {
      W[j] = view.getUint32(i + j * 4, false)
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rightRotate(W[j-15], 7) ^ rightRotate(W[j-15], 18) ^ (W[j-15] >>> 3)
      const s1 = rightRotate(W[j-2], 17) ^ rightRotate(W[j-2], 19) ^ (W[j-2] >>> 10)
      W[j] = (W[j-16] + s0 + W[j-7] + s1) | 0
    }

    let [a, b, c, d, e, f, g, h] = H

    for (let j = 0; j < 64; j++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[j] + W[j]) | 0
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) | 0

      h = g
      g = f
      f = e
      e = (d + temp1) | 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) | 0
    }

    H = [
      (H[0] + a) | 0, (H[1] + b) | 0, (H[2] + c) | 0, (H[3] + d) | 0,
      (H[4] + e) | 0, (H[5] + f) | 0, (H[6] + g) | 0, (H[7] + h) | 0
    ]
  }

  return H.map(h => (h >>> 0).toString(16).padStart(8, '0')).join('')
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

  // Diun integration state
  const [updates, setUpdates] = useState<Update[]>([])
  const [loadingUpdates, setLoadingUpdates] = useState(false)
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto')
  const [showHistory, setShowHistory] = useState(false)
  const apiClient = useMemo(() => new ApiClient(config?.backend_url ?? 'http://localhost:3000'), [config?.backend_url])

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
    const storedPinHash = sessionStorage.getItem('portainer_pin_hash')
    if (authed === 'true' && storedPinHash) {
      setIsAuthenticated(true)
      apiClient.setPinHash(storedPinHash)
    }
  }, [apiClient])

  // Load updates from backend when authenticated
  const loadUpdates = async () => {
    if (!isAuthenticated || config?.backend_url === undefined) return

    try {
      setLoadingUpdates(true)
      const data = await apiClient.getUpdates()
      setUpdates(data)

      // Auto-switch to auto tab if there are updates
      if (data.length > 0 && activeTab === 'manual') {
        setActiveTab('auto')
      }
    } catch (error) {
      console.error('Failed to load updates:', error)
    } finally {
      setLoadingUpdates(false)
    }
  }

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || config?.backend_url === undefined) return

    loadUpdates()
    const interval = setInterval(loadUpdates, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, config?.backend_url])

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
    console.log('Login attempted')
    if (!config) {
      console.log('No config loaded')
      return
    }

    try {
      console.log('Hashing PIN...')
      const hashedPin = await sha256(pinInput)
      console.log('Hashed PIN:', hashedPin)
      console.log('Config PIN:', config.pin)

      if (hashedPin === config.pin) {
        setIsAuthenticated(true)
        sessionStorage.setItem('portainer_authed', 'true')
        sessionStorage.setItem('portainer_pin_hash', hashedPin)
        apiClient.setPinHash(hashedPin)
        setPinInput('')
        console.log('Authentication successful')
      } else {
        addToast('Incorrect PIN', 'error')
        setPinInput('')
        console.log('Authentication failed')
      }
    } catch (error) {
      console.error('Error during authentication:', error)
      addToast('Authentication error', 'error')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('portainer_authed')
    sessionStorage.removeItem('portainer_pin_hash')
    setPinInput('')
  }

  const triggerWebhook = async (webhook: Webhook) => {
    setLoadingWebhooks(prev => new Set(prev).add(webhook.webhook_url))

    try {
      const response = await fetch(webhook.webhook_url, {
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
        next.delete(webhook.webhook_url)
        return next
      })
    }
  }

  // Handlers for Diun updates
  const handleTriggerUpdate = async (updateId: number) => {
    try {
      const update = updates.find(u => u.id === updateId)
      await apiClient.triggerUpdate(updateId)
      addToast(`✓ ${update?.containerName || update?.image} update triggered`, 'success')
      await loadUpdates() // Refresh list
    } catch (error) {
      addToast(`✗ Failed to trigger update: ${error}`, 'error')
      throw error
    }
  }

  const handleTriggerBatch = async (updateIds: number[]) => {
    try {
      const result = await apiClient.triggerBatch(updateIds)
      if (result.success) {
        addToast(`✓ Triggered ${result.summary.succeeded} update(s)`, 'success')
      } else {
        addToast(`⚠ Triggered ${result.summary.succeeded}/${result.summary.total} updates`, 'error')
      }
      await loadUpdates() // Refresh list
    } catch (error) {
      addToast(`✗ Failed to trigger batch update: ${error}`, 'error')
      throw error
    }
  }

  const handleDismissUpdate = async (updateId: number) => {
    try {
      await apiClient.dismissUpdate(updateId)
      await loadUpdates() // Refresh list
    } catch (error) {
      addToast(`✗ Failed to dismiss update: ${error}`, 'error')
      throw error
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
        {/* Tabs and History button */}
        {config.backend_url !== undefined && (
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('auto')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'auto'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Auto-Detected
                  {updates.length > 0 && (
                    <span className="bg-blue-600 dark:bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {updates.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'manual'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
              >
                Manual Webhooks
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(true)}
            >
              <Clock className="w-4 h-4 mr-2" />
              History
            </Button>
          </div>
        )}

        {/* Auto-detected updates tab */}
        {config.backend_url !== undefined && activeTab === 'auto' && (
          <UpdatesList
            updates={updates}
            loading={loadingUpdates}
            onTriggerUpdate={handleTriggerUpdate}
            onTriggerBatch={handleTriggerBatch}
            onDismiss={handleDismissUpdate}
          />
        )}

        {/* Manual webhooks tab */}
        {(config.backend_url === undefined || activeTab === 'manual') && (
          <>
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
                    key={webhook.webhook_url}
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
                      disabled={loadingWebhooks.has(webhook.webhook_url)}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      {loadingWebhooks.has(webhook.webhook_url) ? (
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
          </>
        )}
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

      {/* Update History Modal */}
      {showHistory && config.backend_url && (
        <UpdateHistory
          apiClient={apiClient}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

export default App
