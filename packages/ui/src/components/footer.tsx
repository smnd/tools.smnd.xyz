/**
 * Footer Component
 * Sticky footer with version, copyright, GitHub link, and license info
 */

import { Github } from 'lucide-react'

interface FooterProps {
  version?: string
}

export function Footer({ version }: FooterProps = {}) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            {version && (
              <>
                <span>{version}</span>
                <span className="hidden sm:inline">·</span>
              </>
            )}
            <span>© {currentYear} Tools by Suman</span>
            <span className="hidden sm:inline">·</span>
            <a
              href="https://github.com/smnd/tools.smnd.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
          <div>
            <span>Licensed under </span>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 dark:hover:text-gray-200 underline transition-colors"
            >
              MIT License
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
