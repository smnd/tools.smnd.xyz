import { useConfigStore } from '../../state/configStore'
import { exportUpi, importUpi } from '../../lib/persistence'

export function UpiForm() {
  const upi = useConfigStore(s => s.upi)
  const setUpi = useConfigStore(s => s.setUpi)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">UPI Configuration</h2>
        <div className="flex items-center gap-2">
          <button className="border rounded-md px-3 py-2 bg-white hover:bg-neutral-50 text-sm" onClick={() => exportUpi(upi)}>Export JSON</button>
          <label className="text-sm border rounded-md px-3 py-2 cursor-pointer bg-white hover:bg-neutral-50">
            Import JSON
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
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Payee VPA (pa)</span>
          <input className="border rounded-md p-2" placeholder="merchant@bank" value={upi.pa} onChange={(e) => setUpi({ pa: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Payee Name (pn)</span>
          <input className="border rounded-md p-2" value={upi.pn ?? ''} onChange={(e) => setUpi({ pn: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Amount (am)</span>
          <input className="border rounded-md p-2" placeholder="e.g. 10.00" value={upi.am ?? ''} onChange={(e) => setUpi({ am: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Currency (cu)</span>
          <input className="border rounded-md p-2" placeholder="INR" value={upi.cu ?? ''} onChange={(e) => setUpi({ cu: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Note (tn)</span>
          <input className="border rounded-md p-2" value={upi.tn ?? ''} onChange={(e) => setUpi({ tn: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-medium">Transaction Ref (tr)</span>
          <input className="border rounded-md p-2" value={upi.tr ?? ''} onChange={(e) => setUpi({ tr: e.target.value })} />
        </label>
      </div>
      <p className="text-sm text-neutral-600">UPI is URI-based and not EMVCo.</p>
    </div>
  )
}
