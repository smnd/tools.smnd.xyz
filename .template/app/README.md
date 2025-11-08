# App Template

This template provides a standardized starting point for new apps in the monorepo.

## Using This Template

1. **Copy the template:**
   ```bash
   cp -r .template/app apps/your-app-name
   cd apps/your-app-name
   ```

2. **Update package.json:**
   - Replace `{{APP_NAME}}` with your app name (e.g., `my-tool`)

3. **Update App.tsx:**
   - Replace `{{APP_TITLE}}` with your app's title (e.g., `My Awesome Tool`)
   - Replace `{{APP_DESCRIPTION}}` with a brief description

4. **Add to workspace:**
   Add your app to the workspace in the root `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - 'apps/your-app-name'
   ```

5. **Install dependencies:**
   ```bash
   cd ../.. # back to root
   pnpm install
   ```

6. **Add build script:**
   Add a build script in the root `package.json`:
   ```json
   "build:your-app-name": "pnpm --filter your-app-name build"
   ```

7. **Start developing:**
   ```bash
   cd apps/your-app-name
   pnpm dev
   ```

## What's Included

- ✅ Tailwind CSS with correct content paths for @tools/ui
- ✅ tailwindcss-animate plugin
- ✅ Standardized global CSS with dark mode support
- ✅ ThemeToggle component
- ✅ Footer component
- ✅ Consistent layout structure
- ✅ TypeScript configuration
- ✅ Vite dev server and build setup

## Best Practices

1. **Always include the UI package in Tailwind content paths**
2. **Use the shared UI components from @tools/ui**
3. **Follow the same header/footer layout pattern**
4. **Use consistent spacing and styling**
5. **Test in both light and dark modes**
