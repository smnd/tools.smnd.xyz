import { useEffect, useState } from 'react'
import { PreviewPane } from './components/preview/PreviewPane'
import { EmvcoRoot } from './components/config/EmvcoRoot'
import { UpiForm } from './components/config/UpiForm'
import { useConfigStore } from './state/configStore'
import { Sidebar } from './components/layout/Sidebar'
// import { Tooltip, TooltipContent, TooltipRoot, TooltipTrigger } from './components/ui/tooltip'
// import { exportEmvco, exportUpi, importEmvco, importUpi } from './lib/persistence'

export default function App() {
  const mode = useConfigStore(s => s.mode)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Export/Import handled in panels

  // Theme application
  const theme = useConfigStore(s => s.theme)
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mq.matches)
      root.classList.toggle('dark', isDark)
    }
    apply()
    if (theme === 'system') {
      mq.addEventListener?.('change', apply)
      return () => mq.removeEventListener?.('change', apply)
    }
  }, [theme])

  return (
    <div className="h-full w-full flex">
      <div className="hidden md:block w-64 border-r bg-white dark:bg-neutral-900 dark:border-neutral-800">
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col">
        <header className="border-b bg-white dark:bg-neutral-900 dark:border-neutral-800 px-4 py-3 flex items-center md:gap-4 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-semibold">Payment QR Generator</h1>
            <p className="text-xs text-neutral-500">Compose, validate, and export payment QR codes</p>
          </div>
          <button
            className="md:hidden border rounded-md h-9 w-9 inline-flex items-center justify-center bg-white dark:bg-neutral-900 ml-auto"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="material-symbols-outlined">{sidebarOpen ? 'close' : 'menu'}</span>
          </button>
        </header>
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 min-h-0 p-4 items-start">
          <section className="border rounded-md bg-white dark:bg-neutral-900 dark:border-neutral-800 min-h-0 overflow-auto p-4" aria-label="Configuration panel">
            {mode === 'upi' ? <UpiForm /> : <EmvcoRoot />}
          </section>
          <section className="min-h-0 overflow-auto p-4">
            <div className="border rounded-md bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4" aria-label="Preview and output">
            <PreviewPane />
            </div>
          </section>
        </main>
      </div>
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 fade-in-enter" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full bg-white dark:bg-neutral-900 shadow mobile-drawer-enter flex flex-col">
            <div className="border-b dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Menu</div>
              <button
                className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-white dark:bg-neutral-900"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
