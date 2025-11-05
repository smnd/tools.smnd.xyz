import { create } from 'zustand'
import type { EmvcoConfig, TLV, TLVContainer } from '../lib/payload-builder'
import type { UpiConfig } from '../lib/upi-builder'
import { getSchemeByKey } from '../schemes/sgqr'

export type Mode = 'sgqr' | 'duitnow' | 'upi'

export interface ConfigState {
  mode: Mode
  setMode: (m: Mode) => void

  emvco: EmvcoConfig
  upi: UpiConfig

  // EMVCo mutations
  setEmvco: (p: Partial<EmvcoConfig>) => void
  addScheme: (s: TLVContainer) => void
  removeScheme: (index: number) => void
  moveScheme: (from: number, to: number) => void
  updateScheme: (index: number, data: Partial<TLVContainer>) => void
  addSchemeTag: (schemeIndex: number, tag: TLV) => void
  updateSchemeTag: (schemeIndex: number, tagIndex: number, data: Partial<TLV>) => void
  removeSchemeTag: (schemeIndex: number, tagIndex: number) => void
  moveSchemeTag: (schemeIndex: number, from: number, to: number) => void
  addTag62: (t: TLV) => void
  updateTag62: (index: number, data: Partial<TLV>) => void
  removeTag62: (index: number) => void
  moveTag62: (from: number, to: number) => void

  // UPI mutations
  setUpi: (p: Partial<UpiConfig>) => void

  // Presets
  loadPreset: (name: 'blank' | 'paynow' | 'duitnow' | 'upi') => void

  // Theme
  theme: 'system' | 'light' | 'dark'
  setTheme: (t: 'system' | 'light' | 'dark') => void
}

const defaultEmvco: EmvcoConfig = {
  poiMethod: '11',
  common: { '53': '702', '58': 'SG', '59': 'EXAMPLE SHOP', '60': 'SINGAPORE' },
  additionalData62: [],
  schemes: [],
  qr: { ecc: 'M', moduleSize: 8, color: '#000000', bgColor: '#FFFFFF' },
}

const defaultUpi: UpiConfig = {
  pa: 'merchant@upi',
  pn: 'Example Store',
  am: '10.00',
  cu: 'INR',
  tn: '',
  tr: '',
  qr: { ecc: 'M', moduleSize: 8, color: '#000000', bgColor: '#FFFFFF' },
}

function arrayMove<T>(arr: T[], from: number, to: number) {
  const copy = arr.slice()
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function loadEmvco(): EmvcoConfig | null {
  return loadJson<EmvcoConfig>('emvco-config')
}

function loadUpi(): UpiConfig | null {
  return loadJson<UpiConfig>('upi-config')
}

function loadTheme(): 'system' | 'light' | 'dark' | null {
  try {
    const raw = localStorage.getItem('theme')
    if (!raw) return null
    if (raw === 'system' || raw === 'light' || raw === 'dark') return raw
    try {
      const parsed = JSON.parse(raw)
      if (parsed === 'system' || parsed === 'light' || parsed === 'dark') return parsed
    } catch {}
    return null
  } catch {
    return null
  }
}

function persistSnapshot(state: Pick<ConfigState, 'emvco' | 'upi' | 'theme'>) {
  saveJson('emvco-config', state.emvco)
  saveJson('upi-config', state.upi)
  if (state.theme) {
    try {
      localStorage.setItem('theme', state.theme)
    } catch {}
  }
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  mode: 'sgqr',
  setMode: (mode) => set({ mode }),

  emvco: loadEmvco() ?? defaultEmvco,
  upi: loadUpi() ?? defaultUpi,

  setEmvco: (p) => {
    set((s) => {
      const next = { ...s.emvco, ...p }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  addScheme: (scheme) => {
    set((s) => {
      const next = { ...s.emvco, schemes: [...(s.emvco.schemes ?? []), scheme] }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  removeScheme: (index) => {
    set((s) => {
      const schemes = (s.emvco.schemes ?? []).filter((_, i) => i !== index)
      const next = { ...s.emvco, schemes }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  moveScheme: (from, to) => {
    set((s) => {
      const next = { ...s.emvco, schemes: arrayMove(s.emvco.schemes ?? [], from, to) }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  updateScheme: (index, data) => {
    set((s) => {
      const schemes = (s.emvco.schemes ?? []).map((scheme, i) =>
        i === index ? { ...scheme, ...data } : scheme
      )
      const next = { ...s.emvco, schemes }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  addSchemeTag: (schemeIndex, tag) => {
    set((s) => {
      const schemes = (s.emvco.schemes ?? []).map((scheme, i) =>
        i === schemeIndex ? { ...scheme, tags: [...scheme.tags, tag] } : scheme
      )
      const next = { ...s.emvco, schemes }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  updateSchemeTag: (schemeIndex, tagIndex, data) => {
    set((s) => {
      const schemes = (s.emvco.schemes ?? []).map((scheme, i) => {
        if (i !== schemeIndex) return scheme
        const tags = scheme.tags.map((tag, ti) =>
          ti === tagIndex ? { ...tag, ...data } : tag
        )
        return { ...scheme, tags }
      })
      const next = { ...s.emvco, schemes }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  removeSchemeTag: (schemeIndex, tagIndex) => {
    set((s) => {
      const schemes = (s.emvco.schemes ?? []).map((scheme, i) => {
        if (i !== schemeIndex) return scheme
        const tags = scheme.tags.filter((_, ti) => ti !== tagIndex)
        return { ...scheme, tags }
      })
      const next = { ...s.emvco, schemes }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  moveSchemeTag: (schemeIndex, from, to) => {
    set((s) => {
      const schemes = (s.emvco.schemes ?? []).map((scheme, i) => {
        if (i !== schemeIndex) return scheme
        return { ...scheme, tags: arrayMove(scheme.tags, from, to) }
      })
      const next = { ...s.emvco, schemes }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  addTag62: (t) => {
    set((s) => {
      const next = {
        ...s.emvco,
        additionalData62: [...(s.emvco.additionalData62 ?? []), t],
      }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  updateTag62: (index, data) => {
    set((s) => {
      const list = (s.emvco.additionalData62 ?? []).map((tag, i) =>
        i === index ? { ...tag, ...data } : tag
      )
      const next = { ...s.emvco, additionalData62: list }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  removeTag62: (index) => {
    set((s) => {
      const list = (s.emvco.additionalData62 ?? []).filter((_, i) => i !== index)
      const next = { ...s.emvco, additionalData62: list }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },
  moveTag62: (from, to) => {
    set((s) => {
      const next = {
        ...s.emvco,
        additionalData62: arrayMove(s.emvco.additionalData62 ?? [], from, to),
      }
      persistSnapshot({ emvco: next, upi: s.upi, theme: s.theme })
      return { emvco: next }
    })
  },

  setUpi: (p) => {
    set((s) => {
      const next = { ...s.upi, ...p }
      persistSnapshot({ emvco: s.emvco, upi: next, theme: s.theme })
      return { upi: next }
    })
  },

  loadPreset: (name) => {
    set((s) => {
      let patch: Partial<ConfigState> = {}
      if (name === 'blank') {
        patch = {
          emvco: { poiMethod: '11', common: {}, additionalData62: [], schemes: [], qr: s.emvco.qr },
        }
      } else if (name === 'paynow') {
        const def = getSchemeByKey('paynow')
        const tags = (def?.subTags ?? []).map(st => ({ id: st.id, value: st.constValue ?? (st.options?.[0]?.value ?? '') }))
        patch = {
          emvco: {
            poiMethod: '11',
            common: { '53': '702', '58': 'SG' },
            additionalData62: [],
            schemes: def ? [{ id: 26, label: def.label, schemeKey: def.key, tags }] : [],
            qr: { ecc: 'M', moduleSize: 8, color: '#000000', bgColor: '#FFFFFF' },
          },
        }
      } else if (name === 'duitnow') {
        patch = {
          emvco: {
            poiMethod: '11',
            common: { '53': '458', '58': 'MY', '59': 'EXAMPLE SHOP', '60': 'KUALA LUMPUR' },
            additionalData62: [],
            schemes: [
              {
                id: 26,
                label: 'DuitNow',
                tags: [
                  { id: '00', value: '' }, // AID required; left blank for user
                ],
              },
            ],
            qr: { ecc: 'M', moduleSize: 8, color: '#000000', bgColor: '#FFFFFF' },
          },
        }
      } else if (name === 'upi') {
        patch = { upi: defaultUpi }
      }
      const next = { ...s, ...patch }
      persistSnapshot({ emvco: next.emvco, upi: next.upi, theme: next.theme })
      return patch
    })
  },

  // Theme
  theme: loadTheme() ?? 'system',
  setTheme: (t) => {
    set(() => {
      persistSnapshot({ emvco: get().emvco, upi: get().upi, theme: t })
      return { theme: t }
    })
  },
}))
