import { Button } from '../ui/button'
import { useConfigStore } from '../../state/configStore'
import { validateBasicEmvco } from '../../lib/validators'
import { exportEmvco, importEmvco } from '../../lib/persistence'
import { getSchemeByKey } from '../../schemes/sgqr'
import { SGQR_SCHEMES } from '../../schemes/sgqr'
import { useState, useMemo } from 'react'
import { MSG } from '../../strings/messages'

export function EmvcoRoot() {
  const emvco = useConfigStore(s => s.emvco)
  const setEmvco = useConfigStore(s => s.setEmvco)
  const addScheme = useConfigStore(s => s.addScheme)
  const removeScheme = useConfigStore(s => s.removeScheme)
  const updateScheme = useConfigStore(s => s.updateScheme)
  const addSchemeTag = useConfigStore(s => s.addSchemeTag)
  const updateSchemeTag = useConfigStore(s => s.updateSchemeTag)
  const removeSchemeTag = useConfigStore(s => s.removeSchemeTag)
  const addTag62 = useConfigStore(s => s.addTag62)
  const updateTag62 = useConfigStore(s => s.updateTag62)
  const removeTag62 = useConfigStore(s => s.removeTag62)
  const moveTag62 = useConfigStore(s => s.moveTag62)
  const loadPreset = useConfigStore(s => s.loadPreset)

  const issues = validateBasicEmvco(emvco)
  const [addSel, setAddSel] = useState<string>('')
  const usedKeys = useMemo(() => new Set(((emvco.schemes ?? []).map(s => s.schemeKey).filter(Boolean) as string[])), [emvco.schemes])

  const handleAddPredefined = (key: string) => {
    const def = getSchemeByKey(key)
    if (!def) return
    if (usedKeys.has(key)) return
    const nextId = nextSequentialId(emvco?.schemes)
    // Add all defined sub-tags by default: prefer constValue, else first option, else empty
    const tags = def.subTags.map(st => ({ id: st.id, value: st.constValue ?? (st.options?.[0]?.value ?? '') }))
    addScheme({ id: nextId, label: def.label, schemeKey: def.key, tags })
    setAddSel('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">EMVCo Configuration</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm">Preset:</label>
          <select className="border rounded-md p-2" onChange={(e) => loadPreset(e.target.value as any)} defaultValue="paynow">
            <option value="blank">Blank</option>
            <option value="paynow">SGQR/PayNow</option>
            <option value="duitnow">DuitNow</option>
          </select>
          <Button variant="outline" onClick={() => exportEmvco(emvco)}>Export JSON</Button>
          <label className="text-sm border rounded-md px-3 py-2 cursor-pointer bg-white hover:bg-neutral-50">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const res = await importEmvco(file)
              if (res.ok && res.data) setEmvco(res.data)
              else alert(res.error)
            }} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Point of Initiation (01)</span>
          <select className="border rounded-md p-2" value={emvco.poiMethod} onChange={(e) => setEmvco({ poiMethod: e.target.value as '11' | '12' })}>
            <option value="11">11 - Static</option>
            <option value="12">12 - Dynamic</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">MCC (52)</span>
          <input className="border rounded-md p-2" placeholder="e.g. 5399" value={emvco.common?.['52'] ?? ''} onChange={(e) => setEmvco({ common: { ...emvco.common, '52': e.target.value } })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Currency (53)</span>
          <input className="border rounded-md p-2" placeholder="ISO 4217 numeric" value={emvco.common?.['53'] ?? ''} onChange={(e) => setEmvco({ common: { ...emvco.common, '53': e.target.value } })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Amount (54)</span>
          <div className="flex flex-col gap-1">
            <input className="border rounded-md p-2" placeholder="e.g. 10.00" value={emvco.common?.['54'] ?? ''} onChange={(e) => setEmvco({ common: { ...emvco.common, '54': e.target.value } })} />
            {amountError(emvco) && <span className="text-xs text-red-600">{amountError(emvco)}</span>}
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Tip/Convenience (55)</span>
          <input className="border rounded-md p-2" value={emvco.common?.['55'] ?? ''} onChange={(e) => setEmvco({ common: { ...emvco.common, '55': e.target.value } })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Country (58)</span>
          <input className="border rounded-md p-2" placeholder="SG, MY, ..." value={emvco.common?.['58'] ?? ''} onChange={(e) => setEmvco({ common: { ...emvco.common, '58': e.target.value } })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Merchant Name (59)</span>
          <input className="border rounded-md p-2" value={emvco.common?.['59'] ?? ''} onChange={(e) => setEmvco({ common: { ...emvco.common, '59': e.target.value } })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">City (60)</span>
          <input className="border rounded-md p-2" value={emvco.common?.['60'] ?? ''} onChange={(e) => setEmvco({ common: { ...emvco.common, '60': e.target.value } })} />
        </label>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Merchant Account Info (26–51)</h3>
        <div className="flex gap-2 items-center">
          <select className="border rounded-md p-2" value={addSel} onChange={(e) => setAddSel(e.target.value)}>
            <option value="">Add scheme…</option>
            {SGQR_SCHEMES.map(def => (
              <option key={def.key} value={def.key} disabled={usedKeys.has(def.key)}>{def.label}</option>
            ))}
            <option value="custom">Custom</option>
          </select>
          <Button variant="outline" onClick={() => {
            if (addSel && addSel !== 'custom') handleAddPredefined(addSel)
            else if (addSel === 'custom') { addScheme({ id: nextSequentialId(emvco?.schemes), label: 'Custom', schemeKey: undefined, tags: [{ id: '00', value: '' }] }); setAddSel('') }
          }} disabled={!addSel}>Add</Button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {(emvco.schemes ?? []).map((s, i) => (
          <div key={i} className="border rounded-md p-3">
            <div className="flex items-center gap-2">
              <label className="text-sm">Tag</label>
              <input className="border rounded-md p-1 w-16" value={s.id} onChange={(e) => updateScheme(i, { id: clamp26to51(parseInt(e.target.value || '0', 10)) })} disabled={!!s.schemeKey} />
              <input className="border rounded-md p-1 flex-1" placeholder="Label" value={s.label} onChange={(e) => updateScheme(i, { label: e.target.value })} disabled={!!s.schemeKey} />
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => removeScheme(i)}>Remove</Button>
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-medium mb-2">Sub-tags</h4>
              {(s.tags).map((t, ti) => {
                const schemeDef = getSchemeByKey(s.schemeKey)
                const subDef = schemeDef?.subTags.find(d => d.id === t.id)
                const isConst = !!subDef?.constValue
                const subName = subDef?.name
                const inlineError = subTagError(emvco.poiMethod, emvco.common?.['54'] ?? '', s.schemeKey, t.id, t.value, s)
                return (
                  <div key={ti} className="grid grid-cols-[80px_1fr_200px_auto] gap-2 items-center mb-2">
                    <input className="border rounded-md p-1" value={t.id} disabled />
                    <div className="flex flex-col gap-1">
                      {subDef?.options && !isConst ? (
                        <select className="border rounded-md p-2" value={t.value} onChange={(e) => updateSchemeTag(i, ti, { value: e.target.value })}>
                          {subDef.options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : subDef?.id === '04' && s.schemeKey === 'paynow' ? (
                        <DateTimeValue value={t.value} onChange={(val) => updateSchemeTag(i, ti, { value: val })} />
                      ) : (
                        <input className="border rounded-md p-1" value={t.value} onChange={(e) => updateSchemeTag(i, ti, { value: e.target.value })} disabled={isConst} />
                      )}
                      {t.id !== '03' && inlineError && <span className="text-xs text-red-600">{inlineError}</span>}
                      {s.schemeKey === 'paynow' && t.id === '03' && (
                        <EditableAmountNote poi={emvco.poiMethod} amount={emvco.common?.['54'] ?? ''} value={t.value} />
                      )}
                    </div>
                    <span className="text-xs text-neutral-600">{subName ?? ''}</span>
                    <div className="flex gap-1">
                      <Button variant="outline" onClick={() => removeSchemeTag(i, ti)} disabled={(!!s.schemeKey && (t.id === '00' || !!subDef?.required))}>Remove</Button>
                    </div>
                  </div>
                )
              })}
              <Button
                variant="outline"
                onClick={() => {
                  const newId = nextSubTagId(s.tags)
                  const def = getSchemeByKey(s.schemeKey)
                  const subDef = def?.subTags.find(d => d.id === newId)
                  const value = subDef?.constValue ?? (subDef?.options?.[0]?.value ?? '')
                  addSchemeTag(i, { id: newId, value: value ?? '' })
                }}
              >
                Add Sub-tag
              </Button>
              {!s.tags.find(t => t.id === '00') && (
                <p className="text-xs text-amber-600 mt-2">Scheme identifier (sub-tag 00) is required.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2">
        <h3 className="text-sm font-medium">Additional Data Template (62)</h3>
        <Button variant="outline" onClick={() => addTag62({ id: '01', value: '' })}>Add 62 Sub-tag</Button>
      </div>
      <div className="flex flex-col gap-2">
        {(emvco.additionalData62 ?? []).map((t, i) => (
          <div key={i} className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
            <input className="border rounded-md p-1" value={t.id} onChange={(e) => updateTag62(i, { id: e.target.value })} />
            <input className="border rounded-md p-1" value={t.value} onChange={(e) => updateTag62(i, { value: e.target.value })} />
            <div className="flex gap-1">
              <Button variant="outline" onClick={() => i>0 && moveTag62(i, i-1)}>Up</Button>
              <Button variant="outline" onClick={() => moveTag62(i, i+1)}>Down</Button>
              <Button variant="outline" onClick={() => removeTag62(i)}>Remove</Button>
            </div>
          </div>
        ))}
      </div>

      {issues.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-medium mb-1">Warnings/Errors</p>
          <ul className="text-sm list-disc pl-4">
            {issues.map((it, idx) => (
              <li key={idx} className={it.level === 'error' ? 'text-red-700' : 'text-amber-700'}>{it.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function clamp26to51(n: number) {
  if (Number.isNaN(n)) return 26
  return Math.min(51, Math.max(26, n))
}

function nextSequentialId(schemes?: { id: number }[]) {
  const ids = (schemes ?? []).map(s => s.id)
  if (ids.length === 0) return 26
  const next = Math.max(...ids) + 1
  return clamp26to51(next)
}

function nextSubTagId(tags: { id: string }[]): string {
  if (!tags || tags.length === 0) return '00'
  const max = tags.reduce((acc, t) => Math.max(acc, parseInt(t.id, 10) || 0), -1)
  const next = Math.min(99, Math.max(0, max + 1))
  return next.toString().padStart(2, '0')
}

function amountError(emvco: any): string | undefined {
  const poi = emvco?.poiMethod
  const amount = (emvco?.common?.['54'] ?? '').trim()
  const amountNum = amount === '' ? 0 : Number(amount)
  if (poi === '12' && (!amount || !isFinite(amountNum) || amountNum <= 0)) {
    return MSG.amountRequiredForDynamic
  }
  return undefined
}

function subTagError(poi: '11' | '12', amountStr: string, schemeKey: string | undefined, id: string, value: string, scheme: { tags: { id: string; value: string }[] }): string | undefined {
  if (schemeKey !== 'paynow') return undefined
  const amountTrim = (amountStr ?? '').trim()
  const amountNum = amountTrim === '' ? 0 : Number(amountTrim)
  const v01 = scheme.tags.find(t => t.id === '01')?.value ?? ''
  if (id === '02') {
    if (v01 === '0' && value && !value.startsWith('+')) {
      return MSG.paynow02MustStartPlusWhenMobile
    }
  }
  if (id === '03') {
    if (poi === '12' && value !== '0') {
      return MSG.paynow03MustBeZeroWhenDynamic
    }
    if (poi !== '12' && (amountTrim === '' || !isFinite(amountNum) || amountNum === 0) && value === '0') {
      return MSG.paynow03CannotBeZeroWhenNoAmount
    }
  }
  return undefined
}

function parseDateTimeValue(v: string | undefined): { date: string; time: string } {
  const val = (v ?? '').trim()
  if (val.length >= 8) {
    const y = val.slice(0, 4)
    const m = val.slice(4, 6)
    const d = val.slice(6, 8)
    const date = `${y}-${m}-${d}`
    if (val.length >= 14) {
      const hh = val.slice(8, 10)
      const mm = val.slice(10, 12)
      const ss = val.slice(12, 14)
      const time = `${hh}:${mm}:${ss}`
      return { date, time }
    }
    return { date, time: '' }
  }
  return { date: '', time: '' }
}

function toCompactDate(date: string): string | null {
  if (!date) return null
  const parts = date.split('-')
  if (parts.length !== 3) return null
  return parts.join('')
}

function timeToHHmmss(time: string): string | null {
  if (!time) return null
  const parts = time.split(':')
  if (parts.length < 2) return null
  const hh = parts[0]?.padStart(2, '0') ?? '00'
  const mm = parts[1]?.padStart(2, '0') ?? '00'
  const ss = (parts[2] ?? '00').padStart(2, '0')
  return `${hh}${mm}${ss}`
}

function composeDateTime(date: string, time: string): string {
  const ymd = toCompactDate(date)
  if (!ymd) return ''
  const hhmmss = time ? (timeToHHmmss(time) ?? '000000') : '235959'
  return `${ymd}${hhmmss}`
}

function DateTimeValue({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const { date, time } = parseDateTimeValue(value)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 items-center">
        <input type="date" className="border rounded-md p-1" value={date} onChange={(e) => onChange(composeDateTime(e.target.value, time))} />
        <input type="time" step={1} className="border rounded-md p-1" value={time} onChange={(e) => onChange(composeDateTime(date, e.target.value))} />
        <button type="button" className="border rounded-md px-2 py-1 text-sm bg-white hover:bg-neutral-50" onClick={() => onChange('')}>Clear</button>
      </div>
      <input className="border rounded-md p-1 font-mono" readOnly placeholder="YYYYMMDDHHmmss" value={value} />
    </div>
  )
}

function EditableAmountNote({ poi, amount, value }: { poi: '11' | '12'; amount: string; value: string }) {
  const amtTrim = (amount ?? '').trim()
  const amtNum = amtTrim === '' ? 0 : Number(amtTrim)
  const vDynamic = poi === '12' && value !== '0'
  const vEmptyAmt = poi !== '12' && (amtTrim === '' || !isFinite(amtNum) || amtNum === 0) && value === '0'
  return (
    <div className="text-xs">
      <div className={vDynamic ? 'text-red-600' : 'text-neutral-600'}>{MSG.paynow03MustBeZeroWhenDynamic}</div>
      <div className={vEmptyAmt ? 'text-red-600' : 'text-neutral-600'}>{MSG.paynow03CannotBeZeroWhenNoAmount}</div>
    </div>
  )
}
