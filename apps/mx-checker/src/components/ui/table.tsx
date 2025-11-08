/**
 * Table Component
 * Displays MX check results in a table format
 */

import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import type { DomainResult } from '@/lib/mx-checker'

interface TableProps {
  results: DomainResult[]
  limit?: number
  totalCount?: number
}

function StatusIcon({ status }: { status: DomainResult['has_mx_record'] }) {
  if (status === 'Yes') {
    return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500" />
  }
  if (status === 'No') {
    return <XCircle className="w-5 h-5 text-red-600 dark:text-red-500" />
  }
  return <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
}

function StatusBadge({ status }: { status: DomainResult['has_mx_record'] }) {
  const baseClasses = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium'

  if (status === 'Yes') {
    return (
      <span className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300`}>
        <StatusIcon status={status} />
        Valid
      </span>
    )
  }

  if (status === 'No') {
    return (
      <span className={`${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300`}>
        <StatusIcon status={status} />
        Invalid
      </span>
    )
  }

  return (
    <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300`}>
      <StatusIcon status={status} />
      Invalid
    </span>
  )
}

export function Table({ results, limit, totalCount }: TableProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>No results yet. Check some domains to see results here.</p>
      </div>
    )
  }

  const displayResults = limit ? results.slice(0, limit) : results
  const hasMore = totalCount && totalCount > displayResults.length

  return (
    <div className="space-y-3">
      {hasMore && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Showing first {displayResults.length} of {totalCount.toLocaleString()} results. Download CSV to see all records.
          </p>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Domain</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {displayResults.map((result, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                  {result.domain || <span className="text-gray-400 dark:text-gray-500 italic">empty</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  <StatusBadge status={result.has_mx_record} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {result.mx_error_reason || <span className="text-gray-400 dark:text-gray-500">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
