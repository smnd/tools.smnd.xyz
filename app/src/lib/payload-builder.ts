import { crc16ccittFalseHex } from './crc16'

export type TLV = { id: string; value: string }
export type TLVContainer = { id: number; tags: TLV[]; label: string; schemeKey?: string }

export type QrOptions = {
  ecc: 'L' | 'M' | 'Q' | 'H'
  moduleSize: number
  color: string
  bgColor: string
}

export interface EmvcoConfig {
  poiMethod: '11' | '12'
  common?: Record<string, string>
  additionalData62?: TLV[]
  schemes?: TLVContainer[]
  qr?: QrOptions
}

export function byteLenUtf8(s: string) {
  return new TextEncoder().encode(s).length
}

function enc(id: string, value: string) {
  const len = byteLenUtf8(value).toString().padStart(2, '0')
  return `${id}${len}${value}`
}

export function buildPayload(cfg: EmvcoConfig): string {
  const parts: string[] = []
  // 00 fixed to 01 per requirements
  parts.push(enc('00', '01'))
  parts.push(enc('01', cfg.poiMethod))

  const common = cfg.common ?? {}
  const commonOrder = Object.keys(common).sort()
  for (const k of commonOrder) {
    const v = (common as any)[k]
    if (v == null) continue
    const trimmed = String(v).trim()
    if (trimmed.length === 0) continue
    parts.push(enc(k, trimmed))
  }

  // Schemes (26–51)
  for (const c of cfg.schemes ?? []) {
    const inner = c.tags
      .map(t => ({ id: t.id, value: (t.value ?? '').trim() }))
      .filter(t => t.value.length > 0)
      .map(t => enc(t.id, t.value))
      .join('')
    if (inner.length > 0) {
      parts.push(enc(c.id.toString(), inner))
    }
  }

  // Additional Data 62
  if (cfg.additionalData62 && cfg.additionalData62.length) {
    const inner = cfg.additionalData62
      .map(t => ({ id: t.id, value: (t.value ?? '').trim() }))
      .filter(t => t.value.length > 0)
      .map(t => enc(t.id, t.value))
      .join('')
    if (inner.length > 0) parts.push(enc('62', inner))
  }

  // Append 63 length placeholder
  const partial = parts.join('') + '63' + '04'
  const crc = crc16ccittFalseHex(new TextEncoder().encode(partial))
  return partial + crc
}
