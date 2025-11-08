/**
 * CSV Utilities
 * Handles CSV parsing and generation for MX checker
 */

import Papa from 'papaparse'
import type { DomainResult } from './mx-checker'

export interface CSVRow {
  domain: string
  [key: string]: string
}

/**
 * Parse a CSV file to extract domains
 * @param file - The CSV file to parse
 * @returns Promise with array of domain strings
 */
export async function parseCSV(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Check if 'domains' column exists (case-insensitive)
        const fields = results.meta.fields || []
        const domainField = fields.find(
          field => field.toLowerCase() === 'domains' || field.toLowerCase() === 'domain'
        )

        if (!domainField) {
          reject(new Error('CSV must have a "domains" or "domain" column'))
          return
        }

        // Extract domains from the column
        const data = results.data as Record<string, string>[]
        const domains = data
          .map(row => row[domainField]?.trim() || '')
          .filter(domain => domain.length > 0)

        resolve(domains)
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`))
      }
    })
  })
}

/**
 * Generate CSV string from domain results
 * @param results - Array of domain check results
 * @returns CSV string
 */
export function generateCSV(results: DomainResult[]): string {
  if (results.length === 0) {
    return 'domain,has_mx_record,mx_error_reason\n'
  }

  // Create header
  const header = 'domain,has_mx_record,mx_error_reason'

  // Create rows
  const rows = results.map(result => {
    // Escape values that contain commas or quotes
    const escapeCsvValue = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    return [
      escapeCsvValue(result.domain),
      escapeCsvValue(result.has_mx_record),
      escapeCsvValue(result.mx_error_reason)
    ].join(',')
  })

  return [header, ...rows].join('\n')
}

/**
 * Download CSV file to user's computer
 * @param csvString - The CSV content as a string
 * @param filename - Optional filename (without extension)
 */
export function downloadCSV(csvString: string, filename: string = 'mx-check-results'): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
