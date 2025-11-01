import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type ToastVariant = 'default' | 'success' | 'error'

type ToastInput = {
  id?: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

type ToastInstance = ToastInput & { id: string }

type ToastContextValue = {
  pushToast: (toast: ToastInput) => string
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInstance[]>([])
  const timers = useRef<Record<string, number>>({})

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current[id]
    if (timer) {
      window.clearTimeout(timer)
      delete timers.current[id]
    }
  }, [])

  const pushToast = useCallback(
    (toast: ToastInput) => {
      const id = toast.id ?? `toast-${Date.now()}-${++toastCounter}`
      const instance: ToastInstance = {
        id,
        variant: toast.variant ?? 'default',
        duration: toast.duration ?? 3200,
        title: toast.title,
        description: toast.description,
      }
      setToasts(prev => [...prev, instance])
      const duration = instance.duration ?? 3200
      if (duration > 0) {
        timers.current[id] = window.setTimeout(() => dismissToast(id), duration)
      }
      return id
    },
    [dismissToast]
  )

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(handle => window.clearTimeout(handle))
      timers.current = {}
    }
  }, [])

  const value = useMemo(() => ({ pushToast, dismissToast }), [pushToast, dismissToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1200] flex justify-center px-4 sm:items-end sm:justify-end sm:pr-6">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}

function ToastItem({ toast, onDismiss }: { toast: ToastInstance; onDismiss: (id: string) => void }) {
  const { id, title, description, variant } = toast
  const variantClasses = {
    default: 'border border-neutral-200/70 bg-white/90 text-neutral-800 shadow-lg dark:border-neutral-700/70 dark:bg-neutral-900/90 dark:text-neutral-100',
    success: 'border border-emerald-200/80 bg-emerald-50/95 text-emerald-800 shadow-lg shadow-emerald-400/20 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-100',
    error: 'border border-red-200/80 bg-red-50/95 text-red-800 shadow-lg shadow-red-400/20 dark:border-red-500/50 dark:bg-red-500/15 dark:text-red-100',
  } as const

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 backdrop-blur-md transition-all duration-200 ${variantClasses[variant ?? 'default']}`}
      role="status"
    >
      <div className="flex-1">
        {title && <div className="text-sm font-semibold leading-tight">{title}</div>}
        {description && <div className="mt-1 text-xs leading-snug text-neutral-600 dark:text-neutral-300">{description}</div>}
      </div>
      <button
        className="rounded-md p-1 text-neutral-500 transition hover:bg-neutral-200/60 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-700/60 dark:hover:text-neutral-100"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        <span className="material-symbols-outlined text-base leading-none">close</span>
      </button>
    </div>
  )
}
