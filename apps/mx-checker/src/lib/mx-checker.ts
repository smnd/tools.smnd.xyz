/**
 * MX Record Checker
 * Uses DNS-over-HTTPS to check for MX records
 */

export interface MXCheckResult {
  hasMX: boolean
  error: string | null
}

export interface DomainResult {
  domain: string
  has_mx_record: 'Yes' | 'No' | 'Invalid domain'
  mx_error_reason: string
}

/**
 * Check if a domain has MX records using DNS-over-HTTPS (Google Public DNS)
 * @param domain - The domain to check
 * @returns Promise with MX check result
 */
export async function checkMXRecords(domain: string): Promise<MXCheckResult> {
  // Handle empty domain
  if (!domain || !domain.trim()) {
    return { hasMX: false, error: 'No domain provided' }
  }

  const cleanDomain = domain.trim()

  try {
    // Use Google's DNS-over-HTTPS API
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=MX`,
      {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    )

    if (!response.ok) {
      return { hasMX: false, error: `HTTP Error: ${response.status}` }
    }

    const data = await response.json()

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

  } catch (error) {
    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      return { hasMX: false, error: 'Timeout: Query timed out' }
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { hasMX: false, error: 'NoNameservers: Network error' }
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
        const { hasMX, error } = await checkMXRecords(domain)

        return {
          domain,
          has_mx_record: !domain.trim() ? 'Invalid domain' as const : (hasMX ? 'Yes' as const : 'No' as const),
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
