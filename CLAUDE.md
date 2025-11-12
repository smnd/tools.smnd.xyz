# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing multiple small web-based utility tools, each deployed independently but sharing common UI components. Currently hosts:
- **Payment QR Generator** (`/apps/qr`) - SGQR/PayNow/DuitNow/UPI QR code generator
- **QR Code Generator** (`/apps/qr-code`) - Simple text/URL to QR converter
- **MX Record Checker** (`/apps/mx-checker`) - Email domain verification tool
- **Portainer Updater** (`/apps/portainer`) - Container update utility

All tools are accessible at tools.smnd.xyz with sub-path routing.

## Tech Stack

- **Monorepo**: pnpm workspaces (v10.20.0+), Node.js 20.0.0+
- **Frontend**: React 19 + TypeScript 5.9.3
- **Build**: Vite 7 (dev server and bundler)
- **Styling**: Tailwind CSS 3 + PostCSS + tailwindcss-animate plugin
- **Shared Components**: Custom `@tools/ui` workspace package
- **UI Primitives**: Radix UI (tooltips, slots), Lucide React icons
- **State**: Zustand (Payment QR app), direct React state (simpler apps)
- **Linting**: ESLint 9 with TypeScript ESLint

## Common Commands

### Development
```bash
pnpm dev:qr           # Run Payment QR Generator (localhost:5173)
pnpm dev:qr-code      # Run QR Code Generator
pnpm dev:mx-checker   # Run MX Record Checker
pnpm dev:portainer    # Run Portainer Updater
```

### Build
```bash
pnpm build:qr         # Build Payment QR Generator
pnpm build:qr-code    # Build QR Code Generator
pnpm build:mx-checker # Build MX Record Checker
pnpm build:portainer  # Build Portainer Updater
pnpm build:all        # Build all apps in /apps/*
```

### Validation & Preview
```bash
node scripts/validate-apps.js  # Check app consistency (run before commits)
pnpm preview:qr               # Preview built QR app
```

### Per-App Commands (from app directory)
```bash
cd apps/qr && pnpm dev      # Start dev server
cd apps/qr && pnpm build    # TypeScript check + Vite build
cd apps/qr && pnpm lint     # Run ESLint
```

## Architecture

### Monorepo Structure
```
apps/                   # Individual applications (each deployed separately)
  ├── qr/              # Most complex app with Zustand, form validation
  ├── qr-code/         # Simpler structure
  ├── mx-checker/
  └── portainer/
packages/
  └── ui/              # Shared UI components (@tools/ui)
      ├── components/  # button, input, textarea, theme-toggle, footer
      ├── lib/         # theme.ts (theme utilities), cn.ts (className utils)
      └── styles/
.template/app/         # Template for scaffolding new apps
scripts/
  └── validate-apps.js # Consistency checker
```

### Shared UI Package Architecture

The `@tools/ui` package is the **single source of truth** for UI components across all apps:

- **Components**: Button, Input, Textarea, ThemeToggle, Footer
- **Theme Management** (`lib/theme.ts`):
  - System preference watching
  - localStorage persistence with 'theme' key
  - Light/dark/auto modes
  - Class-based dark mode implementation
- **Utilities** (`lib/cn.ts`): className merging with tailwind-merge + clsx

**Critical**: All apps MUST import shared components from `@tools/ui` instead of duplicating code.

### Deployment Model

Each app is deployed separately to Vercel but routed through a single domain:
- **Vercel**: Individual projects per app with monorepo-aware builds
- **Cloudflare Workers**: Sub-path routing (tools.smnd.xyz/qr → qr app)
- **Environment Variable**: `VITE_BASE_PATH=/app-name` for sub-path builds
- **Build Config**: Each app has `vercel.json` with custom build commands

This allows independent scaling, isolated failures, and smaller bundle sizes while maintaining a unified user experience.

### Typical App Structure
```
apps/qr/
  ├── src/
  │   ├── components/     # App-specific components (organized by feature)
  │   │   ├── config/     # Configuration panels
  │   │   ├── layout/     # Layout components
  │   │   ├── preview/    # Preview/export functionality
  │   │   └── ui/         # Local UI overrides (rare)
  │   ├── lib/            # Business logic and utilities
  │   ├── state/          # Zustand stores (if needed)
  │   ├── App.tsx         # Main component
  │   ├── main.tsx        # Entry point
  │   └── index.css       # Global styles
  ├── vite.config.ts
  ├── tailwind.config.js  # MUST reference packages/ui in content
  ├── tsconfig.json
  ├── eslint.config.js
  ├── postcss.config.js
  └── vercel.json         # Deployment config
```

## Key Conventions & Requirements

### Mandatory Requirements for All Apps

1. **@tools/ui Dependency**: All apps MUST include `"@tools/ui": "workspace:*"` in dependencies
2. **Tailwind Content Path**: MUST include `"../../packages/ui/src/**/*.{ts,tsx}"` in `tailwind.config.js`
3. **tailwindcss-animate Plugin**: MUST be in Tailwind plugins array
4. **Dark Mode Support**: Required (not optional) - use ThemeToggle component
5. **Standard Layout**: Header + ThemeToggle (top-right) + Main + Footer
6. **Footer Version**: Footer component displays version number

### Styling Conventions

- **Utility-first**: Use Tailwind classes, avoid custom CSS when possible
- **Color Scheme**:
  - Light mode: `bg-gray-50`, `text-gray-900`, borders `gray-200`
  - Dark mode: `bg-gray-900`, `text-white`, borders `gray-700`
- **Dark Mode**: Class-based (`darkMode: 'class'` in Tailwind config)
- **CSS Variables**: Use for adaptive styling (e.g., `--radius`)
- **Responsive**: Mobile-first approach, use `lg:` breakpoints for desktop

### State Management Patterns

- **Simple Apps**: Direct React state (`useState`, `useEffect`)
- **Complex Apps**: Zustand for global state (see Payment QR app)
- **Persistence**: localStorage for client-side data (no backend)
- **No SSR**: Pure SPAs (single-page applications)

### Component Patterns

- Functional components with hooks
- Component co-location (keep components near usage)
- Shared primitives from Radix UI
- Custom variants with class-variance-authority
- Import shared components: `import { Button, ThemeToggle } from '@tools/ui'`

## Adding a New App

1. **Copy Template**: `cp -r .template/app apps/your-app`
2. **Update Configs**:
   - `package.json`: Replace app name and description
   - `App.tsx`: Update title and content
   - `vercel.json`: Ensure build commands point to correct app
3. **Add Root Scripts** in root `package.json`:
   ```json
   "dev:your-app": "pnpm --filter your-app dev",
   "build:your-app": "pnpm --filter your-app build",
   "preview:your-app": "pnpm --filter your-app preview"
   ```
4. **Install Dependencies**: `pnpm install` from root
5. **Validate**: `node scripts/validate-apps.js` to check consistency
6. **Test Locally**: `pnpm dev:your-app`

## Validation Script

Run `node scripts/validate-apps.js` before committing to check:
- Tailwind config includes UI package in content paths
- Required dependencies are present (@tools/ui, tailwindcss-animate)
- Global CSS includes standard dark mode patterns
- tailwindcss-animate is configured in plugins

## Build & Deployment

### Local Build
```bash
pnpm build:app-name        # Build specific app
VITE_BASE_PATH=/path pnpm build:app-name  # Build with sub-path
pnpm build:all             # Build all apps
```

### Vercel Deployment (per app)
1. Create new Vercel project
2. Set **Root Directory**: `apps/app-name`
3. Leave build commands empty (uses `vercel.json`)
4. Set environment variable: `VITE_BASE_PATH=/app-name`
5. Deploy automatically on push to main

### Build Process
Each app's `vercel.json` contains:
```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm build:app-name"
}
```
This ensures monorepo dependencies are properly installed during Vercel builds.

## Important Files

- `pnpm-workspace.yaml` - Workspace configuration for monorepo
- `packages/ui/src/lib/theme.ts` - Centralized theme management logic
- `.template/app/` - Scaffolding template (keep updated)
- `scripts/validate-apps.js` - Consistency enforcement
- Each app's `vercel.json` - Deployment configuration
- Each app's `tailwind.config.js` - MUST reference UI package

## Payment QR App Specifics

The Payment QR Generator (`apps/qr`) is the most complex app:

- **State**: Zustand store (`src/state/configStore.ts`) with localStorage persistence
- **Validation**: Zod schemas + AJV for payment spec validation
- **Forms**: react-hook-form for complex form handling
- **Business Logic**:
  - `lib/payload-builder.ts` - EMVCo QR code payload generation
  - `lib/upi-builder.ts` - UPI QR code generation
  - `lib/crc16.ts` - CRC16-CCITT checksum calculation
  - `lib/validators.ts` - Field validation rules
  - `lib/persistence.ts` - Import/export JSON configs
- **Schemes**: Payment scheme definitions in `src/schemes/`

When modifying this app, understand the EMVCo specification for QR code structure.

## Notes

- **No Testing Framework**: Manual testing is used (could add Vitest if needed)
- **No Backend**: All apps are client-side only
- **Git**: Repository uses `main` branch
- **Node Version**: 20.0.0+ required
- **pnpm Version**: 10.20.0+ required
- **React Version**: All apps use React 19 (latest)
