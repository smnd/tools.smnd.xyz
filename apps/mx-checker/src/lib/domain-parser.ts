/**
 * Domain Parser
 * Handles parsing domains from text input
 */

/**
 * Extract domain from email address
 * If input is already a domain, returns it as-is
 * @param input - Email address or domain
 * @returns Domain part
 */
export function extractDomain(input: string): string {
  const trimmed = input.trim()

  // If input contains @, extract domain part
  if (trimmed.includes('@')) {
    const parts = trimmed.split('@')
    return parts[parts.length - 1].trim()
  }

  return trimmed
}

/**
 * Parse comma-separated domains from text input
 * Handles full email addresses by extracting domain part
 * Handles extra spaces gracefully
 * @param text - Comma-separated input text
 * @param maxDomains - Maximum number of domains to parse (default: 10)
 * @returns Array of unique domains
 */
export function parseTextInput(text: string, maxDomains: number = 10): string[] {
  if (!text || !text.trim()) {
    return []
  }

  // Split by comma
  const parts = text.split(',')

  // Extract domains and clean up
  const domains = parts
    .map(part => extractDomain(part))
    .filter(domain => domain.length > 0)
    .slice(0, maxDomains) // Limit to maxDomains

  // Remove duplicates while preserving order
  return Array.from(new Set(domains))
}

/**
 * Validate if a string looks like a valid domain
 * This is a basic check, not comprehensive
 * @param domain - Domain to validate
 * @returns True if domain appears valid
 */
export function isValidDomainFormat(domain: string): boolean {
  if (!domain || domain.trim().length === 0) {
    return false
  }

  // Basic domain validation regex
  // Allows alphanumeric, dots, and hyphens
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/
  return domainRegex.test(domain.trim())
}

/**
 * Count the number of domains that would be parsed from text
 * @param text - Input text
 * @returns Number of domains
 */
export function countDomains(text: string): number {
  return parseTextInput(text, 999).length // Use high limit for counting
}
