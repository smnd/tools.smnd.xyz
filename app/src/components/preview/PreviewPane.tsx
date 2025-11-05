import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useToast } from '../ui/toast'
import { useConfigStore } from '../../state/configStore'
import { buildPayload } from '../../lib/payload-builder'
import { buildUpiUri } from '../../lib/upi-builder'
// import { Controls } from './Controls'

export function PreviewPane() {
  const mode = useConfigStore(s => s.mode)
  const emvco = useConfigStore(s => s.emvco)
  const upi = useConfigStore(s => s.upi)
  const { pushToast } = useToast()

  const [svg, setSvg] = useState<string>('')
  const [payload, setPayload] = useState<string>('')
  const [qrError, setQrError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const hasGenerated = useRef(false)

  const qrOpts = mode === 'upi' ? (upi.qr ?? { ecc: 'M', moduleSize: 8, color: '#000', bgColor: '#fff' }) : (emvco.qr ?? { ecc: 'M', moduleSize: 8, color: '#000', bgColor: '#fff' })
  const previewSize = 300
  const qrModuleSize = Math.max(1, Number(qrOpts.moduleSize ?? 8))
  const qrRenderSize = Math.max(previewSize, qrModuleSize * 29)

  const accent = useMemo(() => {
    switch (mode) {
      case 'upi':
        return {
          chip: 'bg-rose-500',
        }
      case 'duitnow':
        return {
          chip: 'bg-emerald-500',
        }
      default:
        return {
          chip: 'bg-blue-500',
        }
    }
  }, [mode])

  // Build payload/URI and render SVG
  useEffect(() => {
    const data = mode === 'upi' ? buildUpiUri(upi) : buildPayload(emvco)
    setPayload(data)
    if (hasGenerated.current) {
      setIsDirty(true)
    }
  }, [mode, emvco, upi, qrOpts.ecc, qrOpts.moduleSize, qrOpts.color, qrOpts.bgColor])

  const generateQr = async () => {
    try {
      setIsGenerating(true)
      setQrError(null)
      const svgMarkup = await QRCode.toString(payload, {
        type: 'svg',
        errorCorrectionLevel: qrOpts.ecc,
        color: { dark: qrOpts.color, light: qrOpts.bgColor },
        margin: 4,
        width: qrRenderSize,
      })
      setSvg(svgMarkup)
      setIsDirty(false)
      setQrError(null)
      hasGenerated.current = true
    } catch (err: any) {
      setQrError(err?.message || 'Failed to generate QR')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadSvg = () => {
    if (!svg) {
      pushToast({
        variant: 'error',
        title: 'Nothing to export',
        description: 'Generate the QR code before downloading the SVG.',
      })
      return
    }
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-${mode}.svg`
      a.click()
      URL.revokeObjectURL(url)
      pushToast({
        variant: 'success',
        title: 'SVG exported',
        description: `Saved ${a.download} to your device.`,
      })
    } catch (err: any) {
      pushToast({
        variant: 'error',
        title: 'SVG export failed',
        description: err?.message ?? 'Unable to generate SVG file.',
      })
    }
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const exportPng = async () => {
    if (!hasGenerated.current || !svg) {
      pushToast({
        variant: 'error',
        title: 'Nothing to export',
        description: 'Generate the QR code before downloading the PNG.',
      })
      return
    }
    try {
      const data = payload
      const canvas = canvasRef.current ?? document.createElement('canvas')
      canvasRef.current = canvas
      await QRCode.toCanvas(canvas, data, {
        errorCorrectionLevel: qrOpts.ecc,
        color: { dark: qrOpts.color, light: qrOpts.bgColor },
        margin: 4,
        width: qrRenderSize, // lock to on-screen size
      })
      canvas.toBlob((blob) => {
        if (!blob) {
          pushToast({
            variant: 'error',
            title: 'PNG export failed',
            description: 'Unable to produce a PNG for this payload.',
          })
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `qr-${mode}.png`
        a.click()
        URL.revokeObjectURL(url)
        pushToast({
          variant: 'success',
          title: 'PNG exported',
          description: `Saved ${a.download} to your device.`,
        })
      })
    } catch (err: any) {
      setQrError(err?.message || 'Failed to export QR as PNG')
      pushToast({
        variant: 'error',
        title: 'PNG export failed',
        description: err?.message ?? 'Unable to export QR as PNG.',
      })
    }
  }

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payload)
      pushToast({
        variant: 'success',
        title: 'Payload copied',
        description: 'The QR payload is ready to paste.',
      })
    } catch (err: any) {
      pushToast({
        variant: 'error',
        title: 'Copy failed',
        description: err?.message ?? 'Clipboard access is not available.',
      })
    }
  }

  const modeLabel = useMemo(() => {
    switch (mode) {
      case 'upi':
        return 'UPI'
      case 'duitnow':
        return 'DuitNow'
      default:
        return 'SGQR / PayNow'
    }
  }, [mode])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.24em] text-white', accent.chip)}>
              <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
              Preview · {modeLabel}
            </span>
            <h2 className="mt-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Output &amp; Export</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Keep payloads in sync as you refine configuration.
            </p>
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              isDirty
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-50'
            )}
          >
            <span className="material-symbols-outlined text-base leading-none">{isDirty ? 'refresh' : 'check_circle'}</span>
            {isDirty ? 'Refresh to sync QR' : 'QR is up to date'}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="min-h-[60px] max-h-[200px] overflow-y-auto rounded-lg bg-white px-3 py-2 font-mono text-xs text-neutral-800 break-all dark:bg-neutral-900 dark:text-neutral-100">
              {payload}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyPayload}
            aria-label="Copy payload"
            title="Copy payload"
            className="border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <span className="material-symbols-outlined text-base leading-none">content_copy</span>
          </Button>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="relative flex flex-col items-center gap-5">
          <div className="flex w-full items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-2 font-medium text-neutral-600 dark:text-neutral-300">
              <span className="material-symbols-outlined text-base leading-none">qr_code</span>
              Canvas preview
            </span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">SVG + PNG</span>
          </div>
          <div
            className="relative"
            style={{ width: `${previewSize}px`, height: `${previewSize}px` }}
          >
            <div
              className={cn(
                'absolute inset-0 rounded-xl transition-opacity',
                isDirty ? 'opacity-40' : 'opacity-100'
              )}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            {(!svg || isDirty) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button variant="outline" onClick={generateQr} disabled={isGenerating} className="rounded-xl">
                  {isGenerating ? 'Refreshing…' : 'Refresh QR'}
                </Button>
              </div>
            )}
          </div>
          {qrError && (
            <div className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
              {qrError}
            </div>
          )}
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={downloadSvg} className="flex-1 rounded-lg">
              Export SVG
            </Button>
            <Button variant="outline" onClick={exportPng} className="flex-1 rounded-lg">
              Export PNG
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
