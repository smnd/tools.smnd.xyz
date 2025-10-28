import Ajv2020 from 'ajv/dist/2020'
import emvcoSchema from '../../../docs/schema/config.schema.json'
import upiSchema from '../../../docs/schema/upi-config.schema.json'
import type { EmvcoConfig } from './payload-builder'
import type { UpiConfig } from './upi-builder'

const ajv = new Ajv2020({ allErrors: true })
const validateEmvco = ajv.compile(emvcoSchema as any)
const validateUpi = ajv.compile(upiSchema as any)

export function exportEmvco(cfg: EmvcoConfig) {
  const json = JSON.stringify(cfg, null, 2)
  download(`emvco-config-${Date.now()}.json`, json)
}

export function exportUpi(cfg: UpiConfig) {
  const json = JSON.stringify(cfg, null, 2)
  download(`upi-config-${Date.now()}.json`, json)
}

export async function importEmvco(file: File): Promise<{ ok: boolean; data?: EmvcoConfig; error?: string }>{
  const text = await file.text()
  try {
    const data = JSON.parse(text) as unknown
    if (!validateEmvco(data)) {
      return { ok: false, error: ajv.errorsText(validateEmvco.errors) }
    }
    return { ok: true, data: data as EmvcoConfig }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Invalid JSON' }
  }
}

export async function importUpi(file: File): Promise<{ ok: boolean; data?: UpiConfig; error?: string }>{
  const text = await file.text()
  try {
    const data = JSON.parse(text) as unknown
    if (!validateUpi(data)) {
      return { ok: false, error: ajv.errorsText(validateUpi.errors) }
    }
    return { ok: true, data: data as UpiConfig }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Invalid JSON' }
  }
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
