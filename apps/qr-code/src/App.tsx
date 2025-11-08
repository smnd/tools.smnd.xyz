import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import './App.css'
import { Textarea, Button, ThemeToggle, Footer, getStoredTheme, setStoredTheme, applyTheme, watchSystemTheme, type Theme } from '@tools/ui'
import {
  generateQRCode,
  generateQRCodeSVG,
  downloadQRCodePNG,
  downloadQRCodeSVG,
} from '@/lib/qr'
import { savePayload, loadPayload } from '@/lib/storage'

function App() {
  const [payload, setPayload] = useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [theme, setTheme] = useState<Theme>(getStoredTheme())

  // Load payload from localStorage on mount
  useEffect(() => {
    const savedPayload = loadPayload()
    if (savedPayload) {
      setPayload(savedPayload)
    }
  }, [])

  // Initialize and manage theme
  useEffect(() => {
    applyTheme(theme)
    setStoredTheme(theme)

    // Watch for system theme changes if in auto mode
    if (theme === 'auto') {
      const unwatch = watchSystemTheme(() => applyTheme('auto'))
      return unwatch
    }
  }, [theme])

  // Generate QR code whenever payload changes
  useEffect(() => {
    const generateQR = async () => {
      if (!payload.trim()) {
        setQrCodeDataUrl(null)
        setQrCodeSvg(null)
        return
      }

      setIsGenerating(true)
      try {
        const [dataUrl, svg] = await Promise.all([
          generateQRCode(payload),
          generateQRCodeSVG(payload),
        ])
        setQrCodeDataUrl(dataUrl)
        setQrCodeSvg(svg)
      } catch (error) {
        console.error('Failed to generate QR code:', error)
        setQrCodeDataUrl(null)
        setQrCodeSvg(null)
      } finally {
        setIsGenerating(false)
      }
    }

    const timeoutId = setTimeout(generateQR, 300) // Debounce for 300ms
    return () => clearTimeout(timeoutId)
  }, [payload])

  // Save payload to localStorage whenever it changes
  useEffect(() => {
    savePayload(payload)
  }, [payload])

  const handleDownloadPNG = () => {
    if (qrCodeDataUrl) {
      downloadQRCodePNG(qrCodeDataUrl, 'qrcode')
    }
  }

  const handleDownloadSVG = () => {
    if (qrCodeSvg) {
      downloadQRCodeSVG(qrCodeSvg, 'qrcode')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                QR Code Generator
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Generate QR codes instantly from any text or URL
              </p>
            </div>
            <div className="flex-shrink-0">
              <ThemeToggle theme={theme} onThemeChange={setTheme} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto p-4 md:p-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="payload"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Enter text or URL
                </label>
                <Textarea
                  id="payload"
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  placeholder="Type or paste your text, URL, or any data..."
                  className="min-h-[200px] md:min-h-[400px] font-mono text-sm resize-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{payload.length} characters</span>
                {payload && (
                  <button
                    onClick={() => setPayload('')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">QR Code Preview</h2>

              <div className="flex items-center justify-center min-h-[200px] md:min-h-[400px] bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                {isGenerating ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Generating QR code...</p>
                  </div>
                ) : qrCodeDataUrl ? (
                  <div className="text-center">
                    <img
                      src={qrCodeDataUrl}
                      alt="Generated QR Code"
                      className="max-w-full h-auto"
                      style={{ maxWidth: '300px' }}
                    />
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      Enter text above to generate a QR code
                    </p>
                  </div>
                )}
              </div>

              {/* Download Buttons */}
              {qrCodeDataUrl && !isGenerating && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleDownloadPNG}
                    className="flex-1"
                    variant="default"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PNG
                  </Button>
                  <Button
                    onClick={handleDownloadSVG}
                    className="flex-1"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download SVG
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer version="v1.0.0" />
    </div>
  )
}

export default App
