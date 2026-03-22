'use client'

import { Database, Cloud } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

export function SourceBadge({ source }: { source: 'local' | 'paperclip' }) {
  const isLocal = source === 'local'
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[9px] px-1 py-0 h-3.5 border gap-0.5 inline-flex items-center',
        isLocal
          ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
          : 'bg-indigo-900/30 text-indigo-400 border-indigo-500/30'
      )}
    >
      {isLocal ? <Database className="w-2 h-2" /> : <Cloud className="w-2 h-2" />}
      {isLocal ? 'Local' : 'Paperclip'}
    </Badge>
  )
}
