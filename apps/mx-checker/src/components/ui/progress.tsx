/**
 * Progress Bar Component
 * Shows progress for batch operations
 */

interface ProgressProps {
  current: number
  total: number
  className?: string
}

export function Progress({ current, total, className = '' }: ProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Processing domains...
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          {current.toLocaleString()} / {total.toLocaleString()} ({percentage}%)
        </span>
      </div>
      <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        This may take a few minutes for large files. Please keep this page open.
      </p>
    </div>
  )
}
