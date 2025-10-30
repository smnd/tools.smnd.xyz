import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={200}>{children}</TooltipPrimitive.Provider>
}

export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Content sideOffset={6} className="rounded-md border bg-white px-2 py-1 text-xs shadow dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100">
      {children}
      <TooltipPrimitive.Arrow className="fill-white dark:fill-neutral-800" />
    </TooltipPrimitive.Content>
  )
}

export const TooltipRoot = TooltipPrimitive.Root
