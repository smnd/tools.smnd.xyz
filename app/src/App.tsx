import { useEffect, useRef, useState } from 'react'
import { PreviewPane } from './components/preview/PreviewPane'
import { EmvcoRoot } from './components/config/EmvcoRoot'
import { UpiForm } from './components/config/UpiForm'
import { useConfigStore } from './state/configStore'
import { Sidebar } from './components/layout/Sidebar'
import { QrCode } from 'lucide-react'
// import { Tooltip, TooltipContent, TooltipRoot, TooltipTrigger } from './components/ui/tooltip'
// import { exportEmvco, exportUpi, importEmvco, importUpi } from './lib/persistence'

export default function App() {
  const mode = useConfigStore(s => s.mode)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showPreviewLink, setShowPreviewLink] = useState(true)
  const previewSectionRef = useRef<HTMLElement | null>(null)

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

  useEffect(() => {
    const target = previewSectionRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (!entry) return
        setShowPreviewLink(!entry.isIntersecting)
      },
      { threshold: 0.2 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="h-screen w-full flex justify-center bg-neutral-50 dark:bg-neutral-900">
      <div className="flex flex-col h-full w-full max-w-[1280px]">
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900 md:pl-6 md:pr-6">
          <div className="flex items-center justify-between md:flex-row md:items-center md:gap-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="relative h-11 w-11 shrink-0 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                <div className="relative flex h-full w-full items-center justify-center">
                  <QrCode className="h-5 w-5" />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 md:text-2xl">
                Payment QR Generator
              </h1>
            </div>
            <button
              className="md:hidden border border-neutral-300 rounded-md h-10 w-10 inline-flex items-center justify-center bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="material-symbols-outlined">{sidebarOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </header>
        <div className="flex flex-1 min-h-0">
          <div className="hidden md:flex md:w-[200px] md:min-w-[200px] md:flex-none md:flex-col ml-6">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
          <main className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:overflow-hidden pl-3 pr-3 py-6 md:pl-6 md:pr-6 md:py-8">
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-start lg:h-full">
              <section className="w-full lg:w-auto lg:flex-1 lg:overflow-y-auto lg:h-full" aria-label="Configuration panel">
                <div className="w-full max-w-[calc(100vw-2rem)] lg:max-w-none min-w-[0] mx-auto lg:mx-0 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                  {mode === 'upi' ? <UpiForm /> : <EmvcoRoot />}
                </div>
              </section>
              <section className="w-full lg:flex-1 lg:h-full" id="preview-pane" ref={previewSectionRef}>
                <div className="w-full max-w-[calc(100vw-2rem)] lg:max-w-none rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900 lg:mx-0 lg:sticky lg:top-0" aria-label="Preview and output">
                  <PreviewPane />
                </div>
              </section>
            </div>
          </main>
        </div>
        <a
          href="#preview-pane"
          className={`md:hidden fixed bottom-6 right-5 inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium border border-neutral-800 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-200 ${
            showPreviewLink ? 'opacity-100 translate-y-0 pointer-events-auto hover:bg-neutral-800 dark:hover:bg-neutral-200' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <span className="material-symbols-outlined text-base leading-none">qr_code</span>
          Preview
        </a>
      </div>
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 fade-in-enter" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full bg-white dark:bg-neutral-900 mobile-drawer-enter flex flex-col">
            <div className="border-b border-neutral-200 dark:border-neutral-700 px-4 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Menu</div>
              <button
                className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
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
