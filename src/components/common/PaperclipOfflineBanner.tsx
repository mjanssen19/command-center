'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface PaperclipOfflineBannerProps {
  show: boolean
}

export function PaperclipOfflineBanner({ show }: PaperclipOfflineBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (!show || dismissed) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-950 border border-amber-800 rounded-lg mb-4 text-sm">
      <div className="flex items-center gap-2 text-amber-400">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Paperclip is not running — agent data is unavailable.</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-amber-600 hover:text-amber-400 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
