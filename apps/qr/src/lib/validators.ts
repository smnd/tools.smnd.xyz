export function isTwoDigits(id: string) {
  return /^[0-9]{2}$/.test(id)
}

export function isCurrencyNumeric3(s: string) {
  return /^[0-9]{3}$/.test(s)
}

export function isCountryAlpha2(s: string) {
  return /^[A-Z]{2}$/.test(s)
}

export function isAmount(s: string) {
  return /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s)
}

export type ValidationIssue = { level: 'error' | 'warn'; message: string }

export function validateBasicEmvco(cfg: any): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!cfg) return [{ level: 'error', message: 'Missing config' }]
  if (cfg.poiMethod !== '11' && cfg.poiMethod !== '12') {
    issues.push({ level: 'error', message: 'poiMethod must be 11 or 12' })
  }
  const common = cfg.common ?? {}
  if (common['53'] && !isCurrencyNumeric3(common['53'])) {
    issues.push({ level: 'error', message: 'Currency (53) must be 3-digit numeric' })
  }
  if (common['54'] && !isAmount(common['54'])) {
    issues.push({ level: 'error', message: 'Amount (54) must be a positive decimal' })
  }
  if (common['58'] && !isCountryAlpha2(common['58'])) {
    issues.push({ level: 'error', message: 'Country (58) must be 2-letter A–Z' })
  }
  return issues
}

