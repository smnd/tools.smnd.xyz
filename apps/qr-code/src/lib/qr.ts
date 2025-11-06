import QRCode from 'qrcode'

export interface QRCodeOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  margin?: number
  width?: number
}

/**
 * Generate QR code as data URL (PNG format)
 */
export async function generateQRCode(
  text: string,
  options?: QRCodeOptions
): Promise<string> {
  if (!text) {
    throw new Error('Text is required to generate QR code')
  }

  const defaultOptions: QRCodeOptions = {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 300,
  }

  return await QRCode.toDataURL(text, {
    ...defaultOptions,
    ...options,
  })
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(
  text: string,
  options?: QRCodeOptions
): Promise<string> {
  if (!text) {
    throw new Error('Text is required to generate QR code')
  }

  const defaultOptions: QRCodeOptions = {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 300,
  }

  return await QRCode.toString(text, {
    ...defaultOptions,
    ...options,
    type: 'svg',
  })
}

/**
 * Download QR code as PNG file
 */
export function downloadQRCodePNG(dataUrl: string, filename: string = 'qrcode'): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `${filename}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Download QR code as SVG file
 */
export function downloadQRCodeSVG(svgString: string, filename: string = 'qrcode'): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
