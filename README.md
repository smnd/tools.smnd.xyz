# Tools Monorepo

A collection of small web tools and utilities, starting with a Payment QR Generator. This monorepo uses pnpm workspaces for managing multiple apps with shared dependencies and consistent tooling.

## Apps

### QR Generator (`/apps/qr`)
A Vite + React SPA for composing EMVCo/UPI compliant payment QR codes, previewing them with live validation, and exporting the output as SVG or PNG. Features a modern UI with dark-mode support, toast notifications, and responsive layout.

## Features

- **Multi-scheme support** – Build SGQR/PayNow, DuitNow, or UPI payloads from tailored forms.
- **Live preview & export** – Generate the QR, copy the payload, and export SVG/PNG with one click.
- **Modern UI** – Gradient shell, responsive cards, 300 px preview canvas, and mobile shortcuts.
- **Feedback surfaced** – Import/export, copy, and error states flow through persistent toasts.
- **Dark/light/system themes** – Theme toggle stays available across layouts.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7 (`@vitejs/plugin-react`)
- **Styling**: Tailwind CSS 3 + PostCSS
- **State**: Zustand
- **QR Generation**: QRCode.js

## Getting Started

### Prerequisites
- Node.js 16+
- pnpm (install with `npm install -g pnpm`)

### Local Development

```bash
# Install all dependencies
pnpm install

# Run QR app in dev mode (default)
pnpm dev
# Or use the named script
pnpm dev:qr

# When you add more apps:
# pnpm dev:app1
# pnpm dev:app2

# Or run from the app directory
cd apps/qr
pnpm dev
```

The dev server runs on `http://localhost:5173/`. Hot reload is enabled out of the box.

## Building & Testing

```bash
# Build QR app (default)
pnpm build
# Or use the named script
pnpm build:qr

# Build all apps at once
pnpm build:all

# When you add more apps:
# pnpm build:app1
# pnpm build:app2

# Or build from app directory
cd apps/qr
pnpm build
```

The command runs `tsc -b` followed by `vite build`, emitting production assets into `apps/qr/dist/`.

## Deployment

### Vercel Configuration

Each app is deployed as a separate Vercel project. For the QR app:

**Project Settings:**
- **Root Directory**: `apps/qr`
- **Build Command**: `cd ../.. && pnpm install && cd apps/qr && pnpm build`
- **Output Directory**: `dist`
- **Environment Variable**: `VITE_BASE_PATH=/qr`

### Building for Sub-paths

The Vite config reads `VITE_BASE_PATH` to ensure assets resolve when hosted at a sub-path:

```bash
# Example: build for tools.smnd.xyz/qr
cd apps/qr
VITE_BASE_PATH=/qr pnpm build
```

Keep the variable unset (defaults to `/`) for root deployments or local dev.

## Domain Routing with Cloudflare Workers

To host multiple apps on a single domain (e.g. `tools.smnd.xyz/qr`, `tools.smnd.xyz/app1`), a Cloudflare Worker can strip the prefix and proxy requests to the correct Vercel project:

```js
const routes = [
  { prefix: '/qr', target: 'tools-qr.vercel.app' },
  { prefix: '/app1', target: 'tools-app1.vercel.app' },
  // Add more apps here...
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
    return fetch(new Request('https://tools.smnd.xyz', request)) // landing page fallback
  },
}
```

Add worker routes such as `tools.smnd.xyz/qr*` and ensure your DNS record is proxied through Cloudflare.

## Adding New Apps

To add a new tool to the monorepo:

1. **Create the app directory:**
   ```bash
   mkdir apps/new-app
   cd apps/new-app
   ```

2. **Initialize with your preferred framework:**
   ```bash
   # Vite + React (like QR app)
   pnpm create vite . --template react-ts

   # Or copy the QR app structure
   cp -r apps/qr/* apps/new-app/
   ```

3. **Update `apps/new-app/package.json`:**
   ```json
   {
     "name": "new-app",
     "private": true,
     ...
   }
   ```

4. **Install dependencies:**
   ```bash
   pnpm install
   ```

5. **Add scripts to root `package.json`:**
   ```json
   {
     "scripts": {
       "dev:new-app": "pnpm --filter new-app dev",
       "build:new-app": "pnpm --filter new-app build",
       "preview:new-app": "pnpm --filter new-app preview"
     }
   }
   ```

6. **Deploy to Vercel:**
   - Create new Vercel project
   - Root Directory: `apps/new-app`
   - Build Command: `cd ../.. && pnpm install && cd apps/new-app && pnpm build`
   - Set `VITE_BASE_PATH=/new-app` if needed

7. **Update Cloudflare Worker** to add the new route.

## License

MIT.

