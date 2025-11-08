import { useState, useEffect } from 'react'
import { Download, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Button, Textarea, ThemeToggle, Footer, getStoredTheme, setStoredTheme, applyTheme, watchSystemTheme, type Theme } from '@tools/ui'
import { FileUpload } from '@/components/ui/file-upload'
import { Table } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { checkAllDomains, type DomainResult } from '@/lib/mx-checker'
import { parseCSV, generateCSV, downloadCSV } from '@/lib/csv-utils'
import { parseTextInput, countDomains } from '@/lib/domain-parser'
import './App.css'

function App() {
  const [textInput, setTextInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [results, setResults] = useState<DomainResult[]>([])
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(getStoredTheme())

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

  const domainCount = countDomains(textInput)
  const isTextInputValid = domainCount > 0 && domainCount <= 10
  const canCheck = selectedFile !== null || isTextInputValid

  const handleCheck = async () => {
    setError(null)
    setResults([])
    setIsChecking(true)

    // Create a new AbortController for this operation
    const controller = new AbortController()
    setAbortController(controller)

    try {
      let domains: string[] = []

      // Prioritize CSV if file is selected, otherwise use text input
      if (selectedFile) {
        try {
          domains = await parseCSV(selectedFile)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to parse CSV file')
          setIsChecking(false)
          setAbortController(null)
          return
        }
      } else {
        domains = parseTextInput(textInput, 10)
      }

      if (domains.length === 0) {
        setError('No domains found to check')
        setIsChecking(false)
        setAbortController(null)
        return
      }

      setProgress({ current: 0, total: domains.length })

      const checkResults = await checkAllDomains(
        domains,
        (current, total) => {
          setProgress({ current, total })
        },
        controller.signal
      )

      setResults(checkResults)

      // Show message if processing was stopped early
      if (controller.signal.aborted && checkResults.length < domains.length) {
        setError(`Processing stopped. Checked ${checkResults.length} of ${domains.length} domains.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsChecking(false)
      setProgress({ current: 0, total: 0 })
      setAbortController(null)
    }
  }

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleDownload = () => {
    if (results.length === 0) return

    const csvString = generateCSV(results)
    const timestamp = new Date().toISOString().split('T')[0]
    downloadCSV(csvString, `mx-check-results-${timestamp}`)
  }

  const handleClear = () => {
    setResults([])
    setError(null)
    setTextInput('')
    setSelectedFile(null)
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setError(null)
  }

  const validCount = results.filter(r => r.has_mx_record === 'Yes').length
  const invalidCount = results.filter(r => r.has_mx_record === 'No').length
  const errorCount = results.filter(r => r.has_mx_record === 'Invalid domain').length

  // For CSV with more than 5 results, only show first 5 in table
  const shouldLimitTable = selectedFile !== null && results.length > 5
  const tableLimit = shouldLimitTable ? 5 : undefined
  const downloadButtonText = shouldLimitTable ? 'Download Result File' : 'Download CSV'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">MX Record Checker</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Verify email domains by checking MX (Mail Exchange) records in bulk
              </p>
            </div>
            <div className="flex-shrink-0">
              <ThemeToggle theme={theme} onThemeChange={setTheme} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Input</h2>

              <div className="space-y-6">
                {/* CSV Upload Section */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Upload CSV File
                  </label>
                  <FileUpload onFileSelect={handleFileSelect} disabled={isChecking} />
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Don't have a CSV file?{' '}
                      <a
                        href="/sample-domains.csv"
                        download
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                      >
                        Download sample CSV
                      </a>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      CSV must have a "domains" column with one domain per row
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
                  </div>
                </div>

                {/* Text Input Section */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enter domains (comma-separated, max 10)
                  </label>
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="example.com, test@domain.com, another.org"
                    rows={6}
                    disabled={isChecking || selectedFile !== null}
                  />
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-600 dark:text-gray-400">
                      {domainCount} domain{domainCount !== 1 ? 's' : ''} entered
                    </p>
                    {domainCount > 10 && (
                      <p className="text-red-600 dark:text-red-400">Maximum 10 domains allowed</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tip: You can enter full email addresses, and we'll extract the domain part
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={handleCheck}
                  disabled={!canCheck || isChecking}
                  className="flex-1"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking {progress.current}/{progress.total}
                    </>
                  ) : (
                    'Check MX Records'
                  )}
                </Button>
                {isChecking && (
                  <Button onClick={handleStop} variant="outline">
                    Stop
                  </Button>
                )}
                {results.length > 0 && !isChecking && (
                  <Button onClick={handleClear} variant="outline">
                    Clear
                  </Button>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Results</h2>
                {results.length > 0 && !isChecking && (
                  <Button onClick={handleDownload} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    {downloadButtonText}
                  </Button>
                )}
              </div>

              {isChecking && progress.total > 0 && (
                <div className="mb-6">
                  <Progress current={progress.current} total={progress.total} />
                </div>
              )}

              {results.length > 0 && !isChecking && (
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-900">{validCount}</p>
                        <p className="text-xs text-green-700">Valid</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold text-red-900">{invalidCount}</p>
                        <p className="text-xs text-red-700">Invalid</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="text-2xl font-bold text-yellow-900">{errorCount}</p>
                        <p className="text-xs text-yellow-700">Errors</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isChecking && (
                <Table
                  results={results}
                  limit={tableLimit}
                  totalCount={shouldLimitTable ? results.length : undefined}
                />
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
