# Contributing Guide

Welcome to the Tools monorepo! This guide will help you maintain consistency across all apps.

## 🎯 Core Principles

1. **UI Consistency**: All apps should look and feel the same
2. **Shared Components**: Use components from `@tools/ui` package
3. **Standard Configuration**: Follow the established patterns for Tailwind, TypeScript, etc.
4. **Dark Mode Support**: All apps must support light/dark/auto themes

## 📁 Repository Structure

```
tools.smnd.xyz/
├── apps/                    # Individual applications
│   ├── qr/                 # Payment QR Generator
│   ├── qr-code/            # Simple QR Code Generator
│   └── mx-checker/         # MX Record Checker
├── packages/
│   └── ui/                 # Shared UI components
│       ├── src/
│       │   ├── components/ # Shared React components
│       │   └── styles/     # Shared CSS
│       └── tailwind-preset.js  # Shared Tailwind config
├── .template/
│   └── app/                # Template for new apps
└── scripts/
    └── validate-apps.js    # Validation script
```

## 🚀 Adding a New App

### Using the Template (Recommended)

1. **Copy the template:**
   ```bash
   cp -r .template/app apps/your-app-name
   cd apps/your-app-name
   ```

2. **Customize the app:**
   - In `package.json`: Replace `{{APP_NAME}}` with your app name
   - In `src/App.tsx`: Replace `{{APP_TITLE}}` and `{{APP_DESCRIPTION}}`

3. **Add to workspace:**
   Edit `pnpm-workspace.yaml` and add your app:
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

4. **Add build script:**
   Edit root `package.json` and add:
   ```json
   "build:your-app-name": "pnpm --filter your-app-name build"
   ```

5. **Install dependencies:**
   ```bash
   cd ../..
   pnpm install
   ```

6. **Validate:**
   ```bash
   node scripts/validate-apps.js
   ```

## ✅ Required Configuration

Every app MUST have:

### 1. Tailwind Configuration

**File:** `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',  // ⚠️ REQUIRED!
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],  // ⚠️ REQUIRED!
}
```

**Critical:**
- ✅ Must include `'../../packages/ui/src/**/*.{ts,tsx}'` in content paths
- ✅ Must include `tailwindcss-animate` plugin

### 2. Package Dependencies

**File:** `package.json`

Required dependencies:
```json
{
  "dependencies": {
    "@tools/ui": "workspace:*",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "tailwindcss-animate": "^1.0.7",
    "lucide-react": "^0.548.0"
  }
}
```

### 3. Global CSS

**File:** `src/index.css`

Must include:
```css
/* Color scheme hints for native controls */
html { color-scheme: light; }
.dark { color-scheme: dark; }

/* Standardized body styles */
body {
  @apply bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white;
  /* ... other styles */
}

/* Dark mode for native inputs */
.dark input[type="date"],
.dark input[type="time"],
.dark select {
  color-scheme: dark;
}
```

### 4. Standard Layout

**File:** `src/App.tsx`

Every app should follow this structure:
```tsx
<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
  {/* Header with ThemeToggle */}
  <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1>...</h1>
          <p>...</p>
        </div>
        <div className="flex-shrink-0">
          <ThemeToggle theme={theme} onThemeChange={setTheme} />
        </div>
      </div>
    </div>
  </header>

  {/* Main Content */}
  <main className="flex-1 ...">
    {/* Your app content */}
  </main>

  {/* Footer */}
  <Footer version="v1.0.0" />
</div>
```

## 🧪 Validation

Before committing, run the validation script:

```bash
node scripts/validate-apps.js
```

This checks:
- ✅ Tailwind config includes UI package content path
- ✅ Required dependencies are present
- ✅ Global CSS includes standard patterns
- ✅ tailwindcss-animate plugin is configured

## 🎨 Using Shared Components

Import from `@tools/ui`:

```tsx
import {
  Button,
  Input,
  Textarea,
  ThemeToggle,
  Footer,
  getStoredTheme,
  setStoredTheme,
  applyTheme,
  watchSystemTheme,
  type Theme
} from '@tools/ui'
```

### Available Components

- **Button**: Standard button with variants (default, outline, destructive, etc.)
- **Input**: Text input with dark mode support
- **Textarea**: Multi-line text input
- **ThemeToggle**: Light/Dark/Auto theme switcher
- **Footer**: Standard footer with version and links

### Theme Management

```tsx
function App() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
    setStoredTheme(theme)

    if (theme === 'auto') {
      const unwatch = watchSystemTheme(() => applyTheme('auto'))
      return unwatch
    }
  }, [theme])

  return <ThemeToggle theme={theme} onThemeChange={setTheme} />
}
```

## 🚫 Common Mistakes

### ❌ Missing UI Package in Tailwind Content

**Problem:**
```javascript
content: [
  './index.html',
  './src/**/*.{ts,tsx}',
  // Missing: '../../packages/ui/src/**/*.{ts,tsx}'
]
```

**Result:** UI components render without styles (no borders, colors, etc.)

**Fix:** Always include the UI package path

### ❌ Inconsistent ThemeToggle Wrapper

**Problem:**
```tsx
<div className="flex items-center gap-3">  {/* Extra gap */}
  <ThemeToggle theme={theme} onThemeChange={setTheme} />
</div>
```

**Result:** Inconsistent padding across apps

**Fix:** Use simple wrapper:
```tsx
<div className="flex-shrink-0">
  <ThemeToggle theme={theme} onThemeChange={setTheme} />
</div>
```

### ❌ Missing Global CSS Patterns

**Problem:** Not including color-scheme hints

**Result:** Native inputs (date pickers, selects) don't adapt to dark mode

**Fix:** Include all standard CSS patterns from template

## 📦 Building and Deploying

### Development

```bash
cd apps/your-app-name
pnpm dev
```

### Build

```bash
# Build single app
pnpm build:your-app-name

# Build all apps
pnpm build
```

### Validation

```bash
# Check all apps for consistency
node scripts/validate-apps.js
```

## 🆘 Getting Help

- Check existing apps for reference implementations
- Review the template in `.template/app`
- Run validation script to identify issues
- Refer to this guide for best practices

## 📝 Checklist for New Apps

- [ ] Used `.template/app` as starting point
- [ ] Updated `package.json` with app name
- [ ] Updated `App.tsx` with title and description
- [ ] Added to `pnpm-workspace.yaml`
- [ ] Added build script to root `package.json`
- [ ] Ran `pnpm install`
- [ ] Verified Tailwind includes `../../packages/ui/src/**/*.{ts,tsx}`
- [ ] Verified `tailwindcss-animate` is in dependencies
- [ ] Verified global CSS includes standard patterns
- [ ] Ran `node scripts/validate-apps.js`
- [ ] Tested in both light and dark modes
- [ ] Built successfully with `pnpm build`
