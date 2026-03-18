'use client'

import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { usePaperclip } from '@/lib/paperclip'

function getBreadcrumb(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

const statusConfig = {
  connected: { color: 'bg-green-500', label: 'Connected' },
  disconnected: { color: 'bg-red-500', label: 'Offline' },
  unknown: { color: 'bg-zinc-600', label: 'Unknown' },
} as const

export function TopBar() {
  const pathname = usePathname()
  const title = getBreadcrumb(pathname)
  const { status } = usePaperclip()
  const config = statusConfig[status]

  return (
    <header className="h-[52px] shrink-0 flex items-center justify-between px-5 bg-zinc-950 border-b border-zinc-800">
      {/* Left: breadcrumb */}
      <span className="text-sm font-medium text-zinc-300">{title}</span>

      {/* Right: search + status */}
      <div className="flex items-center gap-3">
        {/* Cmd+K search trigger */}
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-500 text-xs hover:border-zinc-700 hover:text-zinc-400 transition-colors"
          aria-label="Open command bar"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
          <kbd className="ml-1 font-sans text-[10px] border border-zinc-700 rounded px-1 py-0.5 text-zinc-600">
            ⌘K
          </kbd>
        </button>

        {/* Paperclip status dot */}
        <div
          className="flex items-center gap-1.5"
          title={`Paperclip: ${config.label}`}
        >
          <div className={`w-2 h-2 rounded-full ${config.color}`} />
          <span className="text-xs text-zinc-600 hidden sm:inline">Paperclip</span>
        </div>
      </div>
    </header>
  )
}
