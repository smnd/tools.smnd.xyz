# QR Code Generator

A simple and fast QR code generator built with React and Vite. Enter any text or URL and instantly generate a QR code that you can download as PNG or SVG.

## Features

- **Instant Generation**: QR codes are generated in real-time as you type
- **Multiple Formats**: Download as PNG or SVG
- **Persistent Storage**: Your last input is automatically saved to localStorage
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Clean UI**: Simple, distraction-free interface built with Tailwind CSS

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 3
- **QR Generation**: qrcode library
- **UI Components**: Radix UI primitives

## Getting Started

### Development

```bash
# From the monorepo root
pnpm dev:qr-code

# Or from this directory
pnpm dev
```

The app will be available at `http://localhost:5173/`

### Building

```bash
# From the monorepo root
pnpm build:qr-code

# Or from this directory
pnpm build
```

Built files will be in the `dist/` directory.

### Preview

```bash
# From the monorepo root
pnpm preview:qr-code

# Or from this directory
pnpm preview
```

## Usage

1. Enter or paste any text, URL, or data into the input field
2. The QR code generates automatically in the preview pane
3. Click "Download PNG" or "Download SVG" to save the QR code
4. Your input is automatically saved and will be restored when you return

## Layout

- **Desktop**: Split view with input on the left and QR preview on the right
- **Mobile**: Stacked layout with input at the top and preview below

## Deployment

This app is configured for deployment to Vercel. See the root README for detailed deployment instructions.

### Environment Variables

- `VITE_BASE_PATH`: Set to the sub-path where the app is hosted (e.g., `/qr-code`)

## License

MIT
