import { useConfigStore } from '../../state/configStore'
import { cn } from '@tools/ui'
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
          active ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        )}
        onClick={() => { setMode(id); onNavigate?.() }}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </button>
    )
  }
  return (
    <nav className="p-3 h-full flex flex-col gap-2">
      <div className="px-2 py-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Builders</div>
      <Item id="sgqr" label="SGQR / PayNow" icon={QrCode} />
      <Item id="duitnow" label="DuitNow" icon={Landmark} />
      <Item id="upi" label="UPI" icon={IndianRupee} />
    </nav>
  )
}
