# Payment QR Generator

Payment QR Generator is a Vite + React SPA for composing EMVCo/UPI compliant payment QR codes, previewing them with live validation, and exporting the output as SVG or PNG. The interface now ships with a refreshed layout, dark-mode support, toast notifications, and responsive tweaks that keep the preview and configuration panes aligned across devices.

## Features

- **Multi-scheme support** – Build SGQR/PayNow, DuitNow, or UPI payloads from tailored forms.
- **Live preview & export** – Generate the QR, copy the payload, and export SVG/PNG with one click.
- **Modern UI** – Gradient shell, responsive cards, 300 px preview canvas, and mobile shortcuts.
- **Feedback surfaced** – Import/export, copy, and error states flow through persistent toasts.
- **Dark/light/system themes** – Theme toggle stays available across layouts.

## Tech Stack

- React 18 + TypeScript
- Vite 5 (`@vitejs/plugin-react`)
- Tailwind utility classes (via PostCSS)
- Zustand for state
- QRCode.js for QR rendering

## Local Development

```bash
cd app
npm install
npm run dev
```

The dev server runs on `http://localhost:5173/`. Hot reload is enabled out of the box.

## Building & Testing

```bash
cd app
npm run build
```

The command runs `tsc -b` followed by `vite build`, emitting production assets into `app/dist/`.

## Deploying behind a sub-path

The Vite config reads `VITE_BASE_PATH` to ensure assets resolve when the app is hosted at a sub-path (e.g. `/qr`):

```bash
# Example build for smnd.dev/qr
VITE_BASE_PATH=/qr/ npm run build
```

Keep the variable unset (defaults to `/`) for root deployments or local dev.

## Domain routing with Cloudflare Workers

To host multiple apps on a single domain (e.g. `smnd.dev/qr`, `smnd.dev/app2`), a Cloudflare Worker can strip the prefix and proxy requests to the correct Vercel project:

```js
const routes = [
  { prefix: '/qr', target: 'qr-generator.vercel.app' },
  // ...
]

export default {
  async fetch(request) {
    const url = new URL(request.url)
    for (const { prefix, target } of routes) {
      if (url.pathname === prefix || url.pathname.startsWith(prefix + '/')) {
        const trimmed = url.pathname.slice(prefix.length) || '/'
        const targetUrl = new URL(url)
        targetUrl.hostname = target
        targetUrl.pathname = trimmed
        targetUrl.protocol = 'https:'
        return fetch(new Request(targetUrl, request))
      }
    }
    return fetch(new Request('https://hypo.ink', request)) // landing page fallback
  },
}
```

Add worker routes such as `smnd.dev/qr*` and ensure your DNS record for `smnd.dev` is proxied so the Worker executes.

## License

MIT.

