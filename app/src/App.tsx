import { Button } from './components/ui/button'
import { PreviewPane } from './components/preview/PreviewPane'
import { EmvcoRoot } from './components/config/EmvcoRoot'
import { UpiForm } from './components/config/UpiForm'
import { useConfigStore } from './state/configStore'

export default function App() {
  const mode = useConfigStore(s => s.mode)
  const setMode = useConfigStore(s => s.setMode)

  return (
    <div className="h-full w-full">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">QR Configuration Builder</h1>
        <div className="inline-flex gap-2" role="tablist" aria-label="Builder mode">
          <Button
            variant={mode === 'emvco' ? 'default' : 'outline'}
            onClick={() => setMode('emvco')}
            role="tab"
            aria-selected={mode === 'emvco'}
          >
            EMVCo (SGQR/PayNow, DuitNow)
          </Button>
          <Button
            variant={mode === 'upi' ? 'default' : 'outline'}
            onClick={() => setMode('upi')}
            role="tab"
            aria-selected={mode === 'upi'}
          >
            UPI (URI-based)
          </Button>
        </div>
      </header>
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-[calc(100%-56px)]">
        <section className="border-r min-h-0 overflow-auto p-4" aria-label="Configuration panel">
          {mode === 'emvco' ? <EmvcoRoot /> : <UpiForm />}
        </section>
        <section className="min-h-0 overflow-auto p-4" aria-label="Preview and output">
          <PreviewPane />
        </section>
      </main>
    </div>
  )
}
