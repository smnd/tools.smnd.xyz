# Utilities

A collection of small web tools and utilities. These are tools I require vry frequently, sometimes daily. While some of these already exist widely (for example, QR generation) I still built it jsut for the sake of simplicity. Others like payment QR generation are not widely available; especially with the ability to generate based on different standards.

## Apps

1. **Payment QR Generator**. Generate SGQR/Paynow, DuitNow and UPI compatible payment QRs. I just needed this for testing - both for work and for working on a specialised payment QR parsing app. This does also include some fancy features. You can export the QR configuration as a JSON, so you can save multiple different combinations.

2. **QR Code Generator**. Plain Vanilla QR Code Generator. Nothing fancy. I just built this to be simple and avoid the gunk on most QR generation sites.

3. **MX Record Checker**. This is a simple way to verify email domains by checking the MX records for those domains. It's just something that I worked on to figure out ways of fraudulent account creation using junk emails.

4. **Container Updater**. I run a bunch of Docker containers on my Synology NAS. All the containers are managed via Portainer. I just built this tool to track containers that need updates and to trigger them directly via webhooks without clicking around in the Portainer UI.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
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

## License

MIT.
