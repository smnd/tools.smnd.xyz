import { useConfigStore } from '../../state/configStore'
import { cn } from '@tools/ui'
import { QrCode, Landmark, IndianRupee } from 'lucide-react'

export function BottomNav() {
  const mode = useConfigStore(s => s.mode)
  const setMode = useConfigStore(s => s.setMode)

  const items = [
    { id: 'sgqr' as const, label: 'SGQR', fullLabel: 'SGQR / PayNow', icon: QrCode },
    { id: 'duitnow' as const, label: 'DuitNow', fullLabel: 'DuitNow', icon: Landmark },
    { id: 'upi' as const, label: 'UPI', fullLabel: 'UPI', icon: IndianRupee },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-around gap-2">
          {items.map(({ id, label, fullLabel, icon: Icon }) => {
            const active = mode === id
            return (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={cn(
                  'flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 md:flex-row md:gap-2',
                  active
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                )}
                aria-label={fullLabel}
                aria-pressed={active}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-xs font-medium mt-1 md:mt-0 md:text-sm truncate">
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
