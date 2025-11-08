import { useEffect, useState } from 'react'
import { PreviewPane } from './components/preview/PreviewPane'
import { EmvcoRoot } from './components/config/EmvcoRoot'
import { UpiForm } from './components/config/UpiForm'
import { useConfigStore } from './state/configStore'
import { BottomNav } from './components/layout/BottomNav'
import { ThemeToggle, Footer, getStoredTheme, setStoredTheme, applyTheme, watchSystemTheme, type Theme } from '@tools/ui'
// import { Tooltip, TooltipContent, TooltipRoot, TooltipTrigger } from './components/ui/tooltip'
// import { exportEmvco, exportUpi, importEmvco, importUpi } from './lib/persistence'

export default function App() {
  const mode = useConfigStore(s => s.mode)
  const [theme, setTheme] = useState<Theme>(getStoredTheme())

  // Export/Import handled in panels

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
    <div className="h-screen w-full flex justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col h-full w-full max-w-7xl">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  Payment QR Generator
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Create payment QR codes for SGQR, PayNow, DuitNow, and UPI
                </p>
              </div>
              <div className="flex-shrink-0">
                <ThemeToggle theme={theme} onThemeChange={setTheme} />
              </div>
            </div>
          </div>
        </header>
        <main className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:overflow-hidden px-4 py-6 md:px-6 md:py-8 pb-24">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-start lg:h-full max-w-7xl mx-auto">
            <section className="w-full lg:w-auto lg:flex-1 lg:overflow-y-auto lg:h-full" aria-label="Configuration panel">
              <div className="w-full max-w-[calc(100vw-2rem)] lg:max-w-none min-w-[0] mx-auto lg:mx-0 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                {mode === 'upi' ? <UpiForm /> : <EmvcoRoot />}
              </div>
            </section>
            <section className="w-full lg:flex-1 lg:h-full" id="preview-pane">
              <div className="w-full max-w-[calc(100vw-2rem)] lg:max-w-none rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800 lg:mx-0 lg:sticky lg:top-0" aria-label="Preview and output">
                <PreviewPane />
              </div>
            </section>
          </div>
        </main>
        <BottomNav />
        <Footer version="v0.1" />
      </div>
    </div>
  )
}
