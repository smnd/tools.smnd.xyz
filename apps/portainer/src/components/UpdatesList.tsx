import { useState } from 'react'
import { Button } from '@tools/ui'
import { RefreshCw, Container, Layers, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react'
import type { Update, GroupedUpdates } from '../lib/types'
import { deduplicateUpdates } from '../lib/utils'

interface UpdatesListProps {
  updates: Update[]
  loading: boolean
  onTriggerUpdate: (updateId: number) => Promise<void>
  onTriggerBatch: (updateIds: number[]) => Promise<void>
  onDismiss: (updateId: number) => Promise<void>
}

export function UpdatesList({ updates, loading, onTriggerUpdate, onTriggerBatch, onDismiss }: UpdatesListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [expandedStacks, setExpandedStacks] = useState<Set<string>>(new Set())
  const [triggeringIds, setTriggeringIds] = useState<Set<number>>(new Set())
  const [batchTriggering, setBatchTriggering] = useState(false)

  // Deduplicate updates - keep only the latest update per container
  const uniqueUpdates = deduplicateUpdates(updates)

  // Group updates by stack
  const groupedUpdates: GroupedUpdates[] = uniqueUpdates.reduce((acc, update) => {
    const stackName = update.stack || 'Individual Containers'
    let group = acc.find(g => g.stack === stackName)

    if (!group) {
      group = { stack: stackName, updates: [] }
      acc.push(group)
    }

    group.updates.push(update)
    return acc
  }, [] as GroupedUpdates[])

  // Sort: stacks first, then individual containers
  groupedUpdates.sort((a, b) => {
    if (a.stack === 'Individual Containers') return 1
    if (b.stack === 'Individual Containers') return -1
    return (a.stack || '').localeCompare(b.stack || '')
  })

  const toggleStack = (stackName: string) => {
    setExpandedStacks(prev => {
      const next = new Set(prev)
      if (next.has(stackName)) {
        next.delete(stackName)
      } else {
        next.add(stackName)
      }
      return next
    })
  }

  const toggleSelect = (updateId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(updateId)) {
        next.delete(updateId)
      } else {
        next.add(updateId)
      }
      return next
    })
  }

  const toggleSelectAll = (stackUpdates: Update[]) => {
    const stackIds = new Set(stackUpdates.map(u => u.id))
    const allSelected = stackUpdates.every(u => selectedIds.has(u.id))

    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        stackIds.forEach(id => next.delete(id))
      } else {
        stackIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const handleTriggerSingle = async (updateId: number) => {
    setTriggeringIds(prev => new Set(prev).add(updateId))
    try {
      await onTriggerUpdate(updateId)
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(updateId)
        return next
      })
    } finally {
      setTriggeringIds(prev => {
        const next = new Set(prev)
        next.delete(updateId)
        return next
      })
    }
  }

  const handleTriggerBatch = async () => {
    if (selectedIds.size === 0) return

    setBatchTriggering(true)
    try {
      await onTriggerBatch(Array.from(selectedIds))
      setSelectedIds(new Set())
    } finally {
      setBatchTriggering(false)
    }
  }

  const handleTriggerStack = async (stackUpdates: Update[]) => {
    const ids = stackUpdates.map(u => u.id)
    setBatchTriggering(true)
    try {
      await onTriggerBatch(ids)
    } finally {
      setBatchTriggering(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">Loading updates...</p>
      </div>
    )
  }

  if (uniqueUpdates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No pending updates detected by Diun</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Batch actions */}
      {selectedIds.size > 0 && (() => {
        const selectedUpdates = uniqueUpdates.filter(u => selectedIds.has(u.id))
        const hasNoWebhook = selectedUpdates.some(u => !u.webhookUrl)
        return (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedIds.size} update{selectedIds.size !== 1 ? 's' : ''} selected
                {hasNoWebhook && (
                  <span className="text-xs ml-2 text-orange-600 dark:text-orange-400">
                    (some have no webhook)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                onClick={handleTriggerBatch}
                disabled={batchTriggering || hasNoWebhook}
                title={hasNoWebhook ? 'Some selected updates have no webhook defined' : ''}
              >
                {batchTriggering ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Update Selected
                  </>
                )}
              </Button>
            </div>
          </div>
        )
      })()}

      {/* Grouped updates */}
      {groupedUpdates.map((group) => {
        const isExpanded = expandedStacks.has(group.stack || '')
        const allSelected = group.updates.every(u => selectedIds.has(u.id))
        const someSelected = group.updates.some(u => selectedIds.has(u.id))
        const isStack = group.stack !== 'Individual Containers'

        return (
          <div key={group.stack} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Stack header */}
            {isStack && (
              <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <div className="p-4 flex items-center justify-between gap-4">
                  <button
                    onClick={() => toggleStack(group.stack || '')}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <Layers className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                        {group.stack}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {group.updates.length} update{group.updates.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleSelectAll(group.updates)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    >
                      {allSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : someSelected ? (
                        <Square className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-blue-200 dark:fill-blue-800" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <Button
                      size="sm"
                      onClick={() => handleTriggerStack(group.updates)}
                      disabled={batchTriggering || group.updates.some(u => !u.webhookUrl)}
                      title={group.updates.some(u => !u.webhookUrl) ? 'Some containers have no webhook defined' : ''}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Update Stack
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Container list */}
            <div className={isStack && !isExpanded ? 'hidden' : ''}>
              {group.updates.map((update, index) => (
                <div
                  key={update.id}
                  className={`p-4 flex items-center justify-between gap-4 ${
                    index > 0 || isStack ? 'border-t border-gray-200 dark:border-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleSelect(update.id)}
                      className="flex-shrink-0"
                    >
                      {selectedIds.has(update.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                      )}
                    </button>
                    <Container className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {update.containerName || update.image}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {update.image}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismiss(update.id)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleTriggerSingle(update.id)}
                      disabled={!update.webhookUrl || triggeringIds.has(update.id)}
                    >
                      {!update.webhookUrl ? (
                        'No webhook defined'
                      ) : triggeringIds.has(update.id) ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Update
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
