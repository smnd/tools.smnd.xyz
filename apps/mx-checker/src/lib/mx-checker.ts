/**
 * MX Record Checker
 * Uses DNS-over-HTTPS to check for MX records
 * Tries Google DNS first, falls back to Cloudflare DNS on network errors
 */

import { isValidDomainFormat } from './domain-parser'

export interface MXCheckResult {
  hasMX: boolean
  error: string | null
}

export interface DomainResult {
  domain: string
  has_mx_record: 'Yes' | 'No' | 'Error' | 'Not found' | 'Invalid domain'
  mx_error_reason: string
}

/**
 * Parse a DNS-over-HTTPS JSON response into an MXCheckResult
 */
function parseDnsResponse(data: { Status: number; Answer?: unknown[] }): MXCheckResult {
  // Handle NXDOMAIN (domain doesn't exist)
  if (data.Status === 3) {
    return { hasMX: false, error: 'NXDOMAIN: Domain does not exist' }
  }

  // Handle other DNS errors
  if (data.Status !== 0) {
    return { hasMX: false, error: `DNS Error: Status ${data.Status}` }
  }

  // Check if there are any MX records in the Answer section
  if (!data.Answer || data.Answer.length === 0) {
    return { hasMX: false, error: 'NoAnswer: No MX record found' }
  }

  // MX records found
  return { hasMX: true, error: null }
}

/**
 * Check if a domain has MX records using Google DNS-over-HTTPS
 */
async function checkWithGoogleDns(domain: string): Promise<MXCheckResult> {
  const response = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
    { signal: AbortSignal.timeout(5000) }
  )

  if (!response.ok) {
    return { hasMX: false, error: `HTTP Error: ${response.status}` }
  }

  const data = await response.json()
  return parseDnsResponse(data)
}

/**
 * Check if a domain has MX records using Cloudflare DNS-over-HTTPS
 */
async function checkWithCloudflareDns(domain: string): Promise<MXCheckResult> {
  const response = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
    {
      headers: { 'Accept': 'application/dns-json' },
      signal: AbortSignal.timeout(5000)
    }
  )

  if (!response.ok) {
    return { hasMX: false, error: `HTTP Error: ${response.status}` }
  }

  const data = await response.json()
  return parseDnsResponse(data)
}

/**
 * Determines if an error represents a definitive DNS answer
 * (retrying another provider won't produce a different result)
 */
function isDefinitiveDnsAnswer(error: string | null): boolean {
  if (!error) return false
  return error.startsWith('NXDOMAIN:') || error.startsWith('NoAnswer:') || error.startsWith('DNS Error:')
}

/**
 * Check if a domain has MX records using DNS-over-HTTPS
 * Tries Google DNS first, falls back to Cloudflare on network/HTTP errors
 * @param domain - The domain to check
 * @returns Promise with MX check result
 */
export async function checkMXRecords(domain: string): Promise<MXCheckResult> {
  // Handle empty domain
  if (!domain || !domain.trim()) {
    return { hasMX: false, error: 'No domain provided' }
  }

  const cleanDomain = domain.trim()

  // Try Google DNS first
  try {
    const result = await checkWithGoogleDns(cleanDomain)
    // If we got a definitive answer (success or DNS-level error), return it
    if (result.hasMX || isDefinitiveDnsAnswer(result.error)) {
      return result
    }
    // For HTTP errors, fall through to Cloudflare
  } catch {
    // Network error, timeout, etc. — fall through to Cloudflare
  }

  // Fallback to Cloudflare DNS
  try {
    return await checkWithCloudflareDns(cleanDomain)
  } catch (error) {
    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      return { hasMX: false, error: 'Timeout: Query timed out' }
    }

    // Handle network errors
    if (error instanceof TypeError) {
      return { hasMX: false, error: 'Network error: Unable to reach DNS servers' }
    }

    // Generic error handling
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { hasMX: false, error: `Error: ${errorMessage}` }
  }
}

/**
 * Check multiple domains with progress tracking and rate limiting
 * @param domains - Array of domains to check
 * @param onProgress - Callback function for progress updates
 * @param signal - Optional AbortSignal to cancel the operation
 * @returns Promise with array of results
 */
export async function checkAllDomains(
  domains: string[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<DomainResult[]> {
  const results: DomainResult[] = []
  const batchSize = 5 // Process 5 domains concurrently
  const delay = 100 // 100ms delay between batches to avoid rate limiting

  for (let i = 0; i < domains.length; i += batchSize) {
    // Check if operation was aborted
    if (signal?.aborted) {
      break
    }

    const batch = domains.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (domain) => {
        if (!domain.trim()) {
          return {
            domain,
            has_mx_record: 'Invalid domain' as const,
            mx_error_reason: 'Empty domain'
          }
        }

        if (!isValidDomainFormat(domain)) {
          return {
            domain,
            has_mx_record: 'Invalid domain' as const,
            mx_error_reason: 'Invalid domain format'
          }
        }

        const { hasMX, error } = await checkMXRecords(domain)

        let status: DomainResult['has_mx_record']
        if (hasMX) {
          status = 'Yes'
        } else if (error?.startsWith('NXDOMAIN:')) {
          status = 'Not found'
        } else if (error?.startsWith('NoAnswer:') || error?.startsWith('DNS Error:')) {
          status = 'No'
        } else {
          status = 'Error'
        }

        return {
          domain,
          has_mx_record: status,
          mx_error_reason: error || ''
        }
      })
    )

    results.push(...batchResults)

    // Call progress callback if provided
    if (onProgress) {
      onProgress(results.length, domains.length)
    }

    // Add delay between batches (except for the last batch)
    if (i + batchSize < domains.length) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return results
}
