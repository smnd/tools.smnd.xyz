import { useConfigStore } from '../../state/configStore'
import { exportUpi, importUpi } from '../../lib/persistence'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function UpiForm() {
  const upi = useConfigStore(s => s.upi)
  const setUpi = useConfigStore(s => s.setUpi)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">UPI Configuration</h2>
          <p className="text-xs text-neutral-500">UPI (URI-based) builder</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-neutral-100" onClick={() => exportUpi(upi)} aria-label="Export" title="Export JSON">
            <span className="material-symbols-outlined">download</span>
          </button>
          <label className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-neutral-100 cursor-pointer" aria-label="Import" title="Import JSON">
            <span className="material-symbols-outlined">upload</span>
            <input type="file" accept="application/json" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const res = await importUpi(file)
              if (res.ok && res.data) setUpi(res.data)
              else alert(res.error)
            }} />
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label>Payee VPA (pa)</Label>
          <Input placeholder="merchant@bank" value={upi.pa} onChange={(e) => setUpi({ pa: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Payee Name (pn)</Label>
          <Input value={upi.pn ?? ''} onChange={(e) => setUpi({ pn: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Amount (am)</Label>
          <Input placeholder="e.g. 10.00" value={upi.am ?? ''} onChange={(e) => setUpi({ am: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Currency (cu)</Label>
          <Input placeholder="INR" value={upi.cu ?? ''} onChange={(e) => setUpi({ cu: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Note (tn)</Label>
          <Input value={upi.tn ?? ''} onChange={(e) => setUpi({ tn: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <Label>Transaction Ref (tr)</Label>
          <Input value={upi.tr ?? ''} onChange={(e) => setUpi({ tr: e.target.value })} />
        </div>
      </div>
      <p className="text-sm text-neutral-600">UPI is URI-based and not EMVCo.</p>
    </div>
  )
}
