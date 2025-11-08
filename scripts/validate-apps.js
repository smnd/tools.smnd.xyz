#!/usr/bin/env node

/**
 * Validation script for app consistency
 *
 * This script checks that all apps in the monorepo follow the standard configuration:
 * - Tailwind config includes UI package in content paths
 * - package.json includes tailwindcss-animate
 * - index.css includes standard global styles
 *
 * Usage: node scripts/validate-apps.js
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const APPS_DIR = 'apps'
const REQUIRED_DEPS = ['tailwindcss-animate', '@tools/ui']
const REQUIRED_TAILWIND_CONTENT = '../../packages/ui/src/**/*.{ts,tsx}'
const REQUIRED_CSS_PATTERNS = [
  'color-scheme: light',
  'color-scheme: dark',
  '@apply bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white',
]

function getAppDirs() {
  return readdirSync(APPS_DIR)
    .filter(name => {
      const path = join(APPS_DIR, name)
      return statSync(path).isDirectory()
    })
}

function validatePackageJson(appName, path) {
  const errors = []
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf-8'))

    for (const dep of REQUIRED_DEPS) {
      if (!pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]) {
        errors.push(`Missing dependency: ${dep}`)
      }
    }
  } catch (err) {
    errors.push(`Failed to read package.json: ${err.message}`)
  }
  return errors
}

function validateTailwindConfig(appName, path) {
  const errors = []
  try {
    const content = readFileSync(path, 'utf-8')

    if (!content.includes(REQUIRED_TAILWIND_CONTENT)) {
      errors.push(`Tailwind config missing UI package content path: ${REQUIRED_TAILWIND_CONTENT}`)
    }

    if (!content.includes('tailwindcss-animate')) {
      errors.push('Tailwind config missing tailwindcss-animate plugin')
    }
  } catch (err) {
    errors.push(`Failed to read tailwind.config.js: ${err.message}`)
  }
  return errors
}

function validateIndexCss(appName, path) {
  const errors = []
  try {
    const content = readFileSync(path, 'utf-8')

    for (const pattern of REQUIRED_CSS_PATTERNS) {
      if (!content.includes(pattern)) {
        errors.push(`index.css missing pattern: ${pattern}`)
      }
    }
  } catch (err) {
    errors.push(`Failed to read index.css: ${err.message}`)
  }
  return errors
}

function main() {
  console.log('🔍 Validating app consistency...\n')

  const apps = getAppDirs()
  let hasErrors = false

  for (const app of apps) {
    console.log(`📦 Checking ${app}...`)

    const pkgErrors = validatePackageJson(app, join(APPS_DIR, app, 'package.json'))
    const tailwindErrors = validateTailwindConfig(app, join(APPS_DIR, app, 'tailwind.config.js'))
    const cssErrors = validateIndexCss(app, join(APPS_DIR, app, 'src', 'index.css'))

    const allErrors = [...pkgErrors, ...tailwindErrors, ...cssErrors]

    if (allErrors.length > 0) {
      hasErrors = true
      console.log(`  ❌ Found ${allErrors.length} issue(s):`)
      for (const error of allErrors) {
        console.log(`     - ${error}`)
      }
    } else {
      console.log('  ✅ All checks passed')
    }
    console.log('')
  }

  if (hasErrors) {
    console.log('❌ Validation failed. Please fix the issues above.')
    console.log('💡 Tip: Use the template in .template/app for new apps')
    process.exit(1)
  } else {
    console.log('✅ All apps are consistent!')
  }
}

main()
