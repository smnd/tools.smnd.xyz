export type UpiConfig = {
  pa: string
  pn?: string
  am?: string
  cu?: string
  tn?: string
  tr?: string
  qr?: {
    ecc: 'L' | 'M' | 'Q' | 'H'
    moduleSize: number
    color: string
    bgColor: string
  }
}

export function buildUpiUri(cfg: UpiConfig): string {
  const params = new URLSearchParams()
  params.set('pa', cfg.pa)
  if (cfg.pn) params.set('pn', cfg.pn)
  if (cfg.am) params.set('am', cfg.am)
  if (cfg.cu) params.set('cu', cfg.cu)
  if (cfg.tn) params.set('tn', cfg.tn)
  if (cfg.tr) params.set('tr', cfg.tr)
  return `upi://pay?${params.toString()}`
}

