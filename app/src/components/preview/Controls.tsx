import { useConfigStore } from '../../state/configStore'

export function Controls() {
  const mode = useConfigStore(s => s.mode)
  const emvco = useConfigStore(s => s.emvco)
  const upi = useConfigStore(s => s.upi)
  const setEmvco = useConfigStore(s => s.setEmvco)
  const setUpi = useConfigStore(s => s.setUpi)
  const qr = mode === 'upi' ? (upi.qr ?? { ecc: 'M', moduleSize: 8, color: '#000000', bgColor: '#FFFFFF' }) : (emvco.qr ?? { ecc: 'M', moduleSize: 8, color: '#000000', bgColor: '#FFFFFF' })

  const update = (next: Partial<typeof qr>) => {
    if (mode === 'upi') setUpi({ qr: { ...qr, ...next } as any })
    else setEmvco({ qr: { ...qr, ...next } as any })
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <label className="text-sm flex flex-col gap-1">
        <span>ECC</span>
        <select className="border rounded-md p-2 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-50" value={qr.ecc} onChange={(e) => update({ ecc: e.target.value as any })}>
          <option value="L">L</option>
          <option value="M">M</option>
          <option value="Q">Q</option>
          <option value="H">H</option>
        </select>
      </label>
      <label className="text-sm flex flex-col gap-1">
        <span>Module Size</span>
        <input className="border rounded-md p-2 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-50" type="number" min={4} max={32} value={qr.moduleSize} onChange={(e) => update({ moduleSize: Math.max(1, Math.min(64, parseInt(e.target.value||'8',10))) })} />
      </label>
      <label className="text-sm flex flex-col gap-1">
        <span>Foreground</span>
        <input className="border rounded-md p-2" type="color" value={qr.color} onChange={(e) => update({ color: e.target.value })} />
      </label>
      <label className="text-sm flex flex-col gap-1">
        <span>Background</span>
        <input className="border rounded-md p-2" type="color" value={qr.bgColor} onChange={(e) => update({ bgColor: e.target.value })} />
      </label>
    </div>
  )
}
