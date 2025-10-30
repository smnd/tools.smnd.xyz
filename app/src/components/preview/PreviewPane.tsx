import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '../ui/button'
import { useConfigStore } from '../../state/configStore'
import { buildPayload } from '../../lib/payload-builder'
import { buildUpiUri } from '../../lib/upi-builder'
import { Controls } from './Controls'

export function PreviewPane() {
  const mode = useConfigStore(s => s.mode)
  const emvco = useConfigStore(s => s.emvco)
  const upi = useConfigStore(s => s.upi)
  const logos = useConfigStore(s => s.branding.logos)

  const [svg, setSvg] = useState<string>('')
  const [payload, setPayload] = useState<string>('')

  const qrOpts = mode === 'upi' ? (upi.qr ?? { ecc: 'M', moduleSize: 8, color: '#000', bgColor: '#fff' }) : (emvco.qr ?? { ecc: 'M', moduleSize: 8, color: '#000', bgColor: '#fff' })

  const logoSrc = useMemo(() => {
    if (mode === 'upi') return logos.upi
    if (mode === 'duitnow') return logos.duitnow
    return logos.sgqr
  }, [mode, logos])

  // Build payload/URI and render SVG
  useEffect(() => {
    const data = mode === 'upi' ? buildUpiUri(upi) : buildPayload(emvco)
    setPayload(data)
    QRCode.toString(data, { type: 'svg', errorCorrectionLevel: qrOpts.ecc, color: { dark: qrOpts.color, light: qrOpts.bgColor }, margin: 4 })
      .then((res) => setSvg(res))
      .catch(() => setSvg(''))
  }, [mode, emvco, upi])

  const downloadSvg = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${mode}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const exportPng = async () => {
    const data = payload
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    await QRCode.toCanvas(canvas, data, {
      errorCorrectionLevel: qrOpts.ecc,
      color: { dark: qrOpts.color, light: qrOpts.bgColor },
      margin: 4,
      width: qrOpts.moduleSize * 29, // approximate; version auto; width in pixels
    })
    // Draw logo overlay at center if available
    const ctx = canvas.getContext('2d')!
    if (logoSrc && ctx) {
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => {
          const w = canvas.width
          const h = canvas.height
          const logoW = Math.floor(Math.min(w, h) * 0.22)
          const logoH = Math.floor((img.height / img.width) * logoW)
          ctx.save()
          ctx.imageSmoothingEnabled = true
          ctx.drawImage(img, (w - logoW) / 2, (h - logoH) / 2, logoW, logoH)
          ctx.restore()
          resolve()
        }
        img.src = logoSrc
      })
    }
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-${mode}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const copyPayload = async () => {
    try { await navigator.clipboard.writeText(payload) } catch {}
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Preview</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyPayload}>Copy Payload</Button>
          <Button variant="outline" onClick={downloadSvg}>Export SVG</Button>
          <Button variant="outline" onClick={exportPng}>Export PNG</Button>
        </div>
      </div>
      <Controls />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-md p-4 bg-white dark:bg-neutral-900 dark:border-neutral-800">
          <div className="relative w-[256px] h-[256px]">
            <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: svg }} />
            {logoSrc && (
              <img src={logoSrc} alt="logo" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[56px] h-auto" />
            )}
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">Logo is auto-selected based on type. Safe area ~20%.</p>
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">Payload</h3>
          <textarea className="w-full h-48 border rounded-md p-2 font-mono text-sm bg-white dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-50" readOnly value={payload} />
        </div>
      </div>
    </div>
  )
}
