import type { Update } from './types'

/**
 * Deduplicate updates by container, keeping only the latest update per container
 * Prioritizes containerName + image for consistency, falls back to containerId, then image
 */
export function deduplicateUpdates(updates: Update[]): Update[] {
  const deduplicatedMap = updates.reduce((acc, update) => {
    // Create a unique key for each container
    // Use containerName + image for consistency (containerId may be inconsistent from Diun)
    const key = update.containerName
      ? `${update.containerName}-${update.image}`
      : update.containerId
        ? `id:${update.containerId}`
        : `image:${update.image}`

    const existing = acc.get(key)
    if (!existing || new Date(update.detectedAt) > new Date(existing.detectedAt)) {
      acc.set(key, update)
    }

    return acc
  }, new Map<string, Update>())

  return Array.from(deduplicatedMap.values())
}
