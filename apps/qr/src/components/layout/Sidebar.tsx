import { useConfigStore } from '../../state/configStore'
import { cn } from '../../lib/utils'
import { QrCode, Landmark, IndianRupee } from 'lucide-react'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const mode = useConfigStore(s => s.mode)
  const setMode = useConfigStore(s => s.setMode)
  const Item = ({ id, label, icon: Icon }: { id: 'sgqr' | 'duitnow' | 'upi'; label: string; icon: any }) => {
    const active = mode === id
    return (
      <button
        className={cn(
          'w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-colors',
          active ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
        )}
        onClick={() => { setMode(id); onNavigate?.() }}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </button>
    )
  }
  const theme = useConfigStore(s => s.theme)
  const setTheme = useConfigStore(s => s.setTheme)
  return (
    <nav className="p-3 h-full flex flex-col gap-2">
      <div className="px-2 py-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Builders</div>
      <Item id="sgqr" label="SGQR / PayNow" icon={QrCode} />
      <Item id="duitnow" label="DuitNow" icon={Landmark} />
      <Item id="upi" label="UPI" icon={IndianRupee} />
      <div className="mt-auto px-2 py-2 flex items-center justify-between">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">v0.1</div>
        <div className="inline-flex gap-1" role="group" aria-label="Theme">
          <button
            className={cn('h-8 w-8 rounded-md inline-flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800', theme==='system' && 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900')}
            aria-label="Auto theme"
            onClick={() => setTheme('system')}
          >
            <span className="material-symbols-outlined">auto_mode</span>
          </button>
          <button
            className={cn('h-8 w-8 rounded-md inline-flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800', theme==='light' && 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900')}
            aria-label="Light theme"
            onClick={() => setTheme('light')}
          >
            <span className="material-symbols-outlined">light_mode</span>
          </button>
          <button
            className={cn('h-8 w-8 rounded-md inline-flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800', theme==='dark' && 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900')}
            aria-label="Dark theme"
            onClick={() => setTheme('dark')}
          >
            <span className="material-symbols-outlined">dark_mode</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
