import { useEffect, useState } from 'react'
import { ThemeToggle, Footer, getStoredTheme, setStoredTheme, applyTheme, watchSystemTheme, type Theme } from '@tools/ui'
import './App.css'

function App() {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {{APP_TITLE}}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{APP_DESCRIPTION}}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Your app content goes here...
          </p>
        </div>
      </main>

      <Footer version="v1.0.0" />
    </div>
  )
}

export default App
