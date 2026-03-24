'use client'

import { Database, Cloud, Bot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

const SOURCE_CONFIG = {
  local: { icon: Database, label: 'Local', className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  openclaw: { icon: Bot, label: 'OpenClaw', className: 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' },
  scanner: { icon: Bot, label: 'OpenClaw', className: 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' },
  paperclip: { icon: Cloud, label: 'Paperclip', className: 'bg-indigo-900/30 text-indigo-400 border-indigo-500/30' },
} as const

export function SourceBadge({ source }: { source: 'local' | 'openclaw' | 'scanner' | 'paperclip' }) {
  const config = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.local
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[9px] px-1 py-0 h-3.5 border gap-0.5 inline-flex items-center',
        config.className
      )}
    >
      <Icon className="w-2 h-2" />
      {config.label}
    </Badge>
  )
}
