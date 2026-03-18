'use client'

import { useState } from 'react'
import { usePaperclip } from '@/lib/paperclip'
import { WifiOff, X } from 'lucide-react'

export function PaperclipOfflineBanner() {
  const { status } = usePaperclip()
  const [dismissed, setDismissed] = useState(false)

  if (status !== 'disconnected' || dismissed) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-900/30 border border-amber-800/50 rounded-lg mb-4 text-amber-200 text-sm">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="flex-1">Paperclip is not running — agent data is unavailable.</span>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
