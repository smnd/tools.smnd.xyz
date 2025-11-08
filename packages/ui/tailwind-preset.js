/**
 * Shared Tailwind CSS preset for all apps
 *
 * This preset ensures consistent styling across all apps by:
 * - Including the UI package in content paths
 * - Providing standard theme extensions
 * - Including required plugins
 *
 * Usage in app tailwind.config.js:
 *
 * import preset from '../../packages/ui/tailwind-preset.js'
 *
 * export default {
 *   presets: [preset],
 *   content: [
 *     './index.html',
 *     './src/**\/*.{ts,tsx}',
 *   ],
 * }
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    // This is a relative path from the preset file location
    // Apps extending this preset will inherit this content path
    './src/**/*.{ts,tsx}',
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
  plugins: [
    require('tailwindcss-animate'),
  ],
}
