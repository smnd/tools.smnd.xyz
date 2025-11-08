# Tools Monorepo

A collection of small web tools and utilities. This monorepo uses pnpm workspaces for managing multiple apps with shared dependencies and consistent tooling.

## Apps

### Payment QR Generator (`/apps/qr`)
A Vite + React SPA for composing EMVCo/UPI compliant payment QR codes, previewing them with live validation, and exporting the output as SVG or PNG. Features a modern UI with dark-mode support, toast notifications, and responsive layout.

### QR Code Generator (`/apps/qr-code`)
A simple and fast QR code generator. Enter any text or URL, and instantly generate a QR code. Download as PNG or SVG format. Features localStorage persistence and a clean, responsive interface.

### MX Record Checker (`/apps/mx-checker`)
Verify email domains by checking MX (Mail Exchange) records in bulk. Supports both text input (comma-separated, up to 10 domains) and CSV file uploads (unlimited domains). Uses DNS-over-HTTPS for fast, browser-based verification. Download results as CSV.

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

# Run Payment QR app in dev mode (default)
pnpm dev
# Or use the named scripts
pnpm dev:qr
pnpm dev:qr-code
pnpm dev:mx-checker

# Or run from the app directory
cd apps/qr
pnpm dev
```

The dev server runs on `http://localhost:5173/`. Hot reload is enabled out of the box.

## Building & Testing

```bash
# Build Payment QR app (default)
pnpm build
# Or use the named scripts
pnpm build:qr
pnpm build:qr-code
pnpm build:mx-checker

# Build all apps at once
pnpm build:all

# Or build from app directory
cd apps/qr
pnpm build
```

The command runs `tsc -b` followed by `vite build`, emitting production assets into `apps/qr/dist/`.

## Deployment

### Vercel Configuration

Each app is deployed as a separate Vercel project with its own `vercel.json` configuration file.

**Example for Payment QR app (`apps/qr/vercel.json`):**
```json
{
  "buildCommand": "cd ../.. && corepack enable && corepack prepare pnpm@10.20.0 --activate && pnpm install && pnpm --filter qr build",
  "outputDirectory": "dist",
  "installCommand": "echo 'Install handled in buildCommand'"
}
```

**Example for QR Code app (`apps/qr-code/vercel.json`):**
```json
{
  "buildCommand": "cd ../.. && corepack enable && corepack prepare pnpm@10.20.0 --activate && pnpm install && pnpm --filter qr-code build",
  "outputDirectory": "dist",
  "installCommand": "echo 'Install handled in buildCommand'"
}
```

**Vercel Project Settings:**
- **Root Directory**: `apps/{app-name}` (e.g., `apps/qr` or `apps/qr-code`)
- **Build/Install/Output**: Leave empty (uses `vercel.json`)
- **Environment Variable**: `VITE_BASE_PATH=/{app-name}` (for sub-path deployments)

### Building for Sub-paths

The Vite config reads `VITE_BASE_PATH` to ensure assets resolve when hosted at a sub-path:

```bash
# Example: build for tools.smnd.xyz/qr
cd apps/qr
VITE_BASE_PATH=/qr pnpm build

# Example: build for tools.smnd.xyz/qr-code
cd apps/qr-code
VITE_BASE_PATH=/qr-code pnpm build
```

Keep the variable unset (defaults to `/`) for root deployments or local dev.

## Domain Routing with Cloudflare Workers

To host multiple apps on a single domain (e.g. `tools.smnd.xyz/qr`, `tools.smnd.xyz/app1`), a Cloudflare Worker can strip the prefix and proxy requests to the correct Vercel project:

```js
const routes = [
  { prefix: '/qr', target: 'tools-qr.vercel.app' },
  { prefix: '/qr-code', target: 'tools-qr-code.vercel.app' },
  { prefix: '/mx-checker', target: 'tools-mx-checker.vercel.app' },
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

6. **Create `vercel.json` for deployment:**
   ```bash
   # Create apps/new-app/vercel.json
   cat > apps/new-app/vercel.json << 'EOF'
   {
     "buildCommand": "cd ../.. && pnpm install && pnpm --filter new-app build",
     "outputDirectory": "dist",
     "installCommand": "echo 'Install handled in buildCommand'"
   }
   EOF
   ```

7. **Deploy to Vercel:**
   - Create new Vercel project linked to your repo
   - Root Directory: `apps/new-app`
   - Leave Build/Install/Output settings empty (uses `vercel.json`)
   - Set `VITE_BASE_PATH=/new-app` environment variable if deploying to sub-path

8. **Update Cloudflare Worker** to add the new route.

## License

MIT.

