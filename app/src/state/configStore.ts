import { create } from 'zustand'
import type { EmvcoConfig, TLV, TLVContainer } from '../lib/payload-builder'
import type { UpiConfig } from '../lib/upi-builder'

export type Mode = 'emvco' | 'upi'

type Branding = {
  logos: {
    sgqr: string
    duitnow: string
    upi: string
  }
}

export interface ConfigState {
  mode: Mode
  setMode: (m: Mode) => void

  branding: Branding

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
}

const defaultEmvco: EmvcoConfig = {
  poiMethod: '11',
  common: { '53': '702', '58': 'SG', '59': 'EXAMPLE SHOP', '60': 'SINGAPORE' },
  additionalData62: [],
  schemes: [
    {
      id: 26,
      label: 'PayNow',
      schemeKey: 'paynow',
      tags: [
        { id: '00', value: 'A000000677010112' },
        { id: '01', value: 'UEN12345678' }
      ],
    },
  ],
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

const initialBranding: Branding = {
  logos: {
    sgqr: '/assets/sgqr.svg',
    duitnow: '/assets/duitnow.svg',
    upi: '/assets/upi.svg',
  },
}

function arrayMove<T>(arr: T[], from: number, to: number) {
  const copy = arr.slice()
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export const useConfigStore = create<ConfigState>((set) => ({
  mode: 'emvco',
  setMode: (mode) => set({ mode }),

  branding: initialBranding,

  emvco: loadEmvco() ?? defaultEmvco,
  upi: loadUpi() ?? defaultUpi,

  setEmvco: (p) => set((s) => saveLocal({ emvco: { ...s.emvco, ...p } }).state),
  addScheme: (scheme) => set((s) => saveLocal({ emvco: { ...s.emvco, schemes: [...(s.emvco.schemes ?? []), scheme] } }).state),
  removeScheme: (index) => set((s) => {
    const schemes = (s.emvco.schemes ?? []).slice()
    schemes.splice(index, 1)
    return saveLocal({ emvco: { ...s.emvco, schemes } }).state
  }),
  moveScheme: (from, to) => set((s) => {
    const schemes = arrayMove(s.emvco.schemes ?? [], from, to)
    return saveLocal({ emvco: { ...s.emvco, schemes } }).state
  }),
  updateScheme: (index, data) => set((s) => {
    const schemes = (s.emvco.schemes ?? []).slice()
    schemes[index] = { ...schemes[index], ...data }
    return saveLocal({ emvco: { ...s.emvco, schemes } }).state
  }),
  addSchemeTag: (schemeIndex, tag) => set((s) => {
    const schemes = (s.emvco.schemes ?? []).slice()
    const sch = schemes[schemeIndex]
    sch.tags = [...sch.tags, tag]
    return saveLocal({ emvco: { ...s.emvco, schemes } }).state
  }),
  updateSchemeTag: (schemeIndex, tagIndex, data) => set((s) => {
    const schemes = (s.emvco.schemes ?? []).slice()
    const sch = schemes[schemeIndex]
    const tags = sch.tags.slice()
    tags[tagIndex] = { ...tags[tagIndex], ...data }
    sch.tags = tags
    return saveLocal({ emvco: { ...s.emvco, schemes } }).state
  }),
  removeSchemeTag: (schemeIndex, tagIndex) => set((s) => {
    const schemes = (s.emvco.schemes ?? []).slice()
    const sch = schemes[schemeIndex]
    const tags = sch.tags.slice()
    tags.splice(tagIndex, 1)
    sch.tags = tags
    return saveLocal({ emvco: { ...s.emvco, schemes } }).state
  }),
  moveSchemeTag: (schemeIndex, from, to) => set((s) => {
    const schemes = (s.emvco.schemes ?? []).slice()
    const sch = schemes[schemeIndex]
    sch.tags = arrayMove(sch.tags, from, to)
    return saveLocal({ emvco: { ...s.emvco, schemes } }).state
  }),
  addTag62: (t) => set((s) => {
    const list = [...(s.emvco.additionalData62 ?? []), t]
    return saveLocal({ emvco: { ...s.emvco, additionalData62: list } }).state
  }),
  updateTag62: (index, data) => set((s) => {
    const list = (s.emvco.additionalData62 ?? []).slice()
    list[index] = { ...list[index], ...data }
    return saveLocal({ emvco: { ...s.emvco, additionalData62: list } }).state
  }),
  removeTag62: (index) => set((s) => {
    const list = (s.emvco.additionalData62 ?? []).slice()
    list.splice(index, 1)
    return saveLocal({ emvco: { ...s.emvco, additionalData62: list } }).state
  }),
  moveTag62: (from, to) => set((s) => {
    const list = arrayMove(s.emvco.additionalData62 ?? [], from, to)
    return saveLocal({ emvco: { ...s.emvco, additionalData62: list } }).state
  }),

  setUpi: (p) => set((s) => saveLocal({ upi: { ...s.upi, ...p } }).state),

  loadPreset: (name) => set((s) => {
    if (name === 'blank') return saveLocal({ emvco: { poiMethod: '11', common: {}, additionalData62: [], schemes: [], qr: s.emvco.qr } }).state
    if (name === 'paynow') return saveLocal({ emvco: defaultEmvco }).state
    if (name === 'duitnow') {
      const cfg: EmvcoConfig = {
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
      }
      return saveLocal({ emvco: cfg }).state
    }
    if (name === 'upi') return saveLocal({ upi: defaultUpi }).state
    return { ...s }
  }),
}))

function saveLocal(patch: Partial<Pick<ConfigState, 'emvco' | 'upi'>>) {
  const state = { ...getGlobalState(), ...patch }
  try {
    if (state.emvco) localStorage.setItem('emvco-config', JSON.stringify(state.emvco))
    if (state.upi) localStorage.setItem('upi-config', JSON.stringify(state.upi))
  } catch {}
  return { state }
}

function loadEmvco(): EmvcoConfig | null {
  try {
    const s = localStorage.getItem('emvco-config')
    return s ? (JSON.parse(s) as EmvcoConfig) : null
  } catch { return null }
}

function loadUpi(): UpiConfig | null {
  try {
    const s = localStorage.getItem('upi-config')
    return s ? (JSON.parse(s) as UpiConfig) : null
  } catch { return null }
}

function getGlobalState(): Pick<ConfigState, 'emvco' | 'upi'> {
  try {
    const e = loadEmvco() ?? defaultEmvco
    const u = loadUpi() ?? defaultUpi
    return { emvco: e, upi: u }
  } catch {
    return { emvco: defaultEmvco, upi: defaultUpi }
  }
}
