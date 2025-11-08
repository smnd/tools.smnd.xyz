/**
 * Tabs Component
 * Simple tabs for switching between input modes
 */

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: { value: string; label: string }[]
}

export function Tabs({ value, onValueChange, tabs }: TabsProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex gap-4" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${
                value === tab.value
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
