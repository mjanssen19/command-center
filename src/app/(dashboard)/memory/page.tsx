'use client'

import { useState, useMemo } from 'react'
import { Brain, Search, Star, Tag, Clock, Cpu, FolderOpen } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { SectionCard } from '@/components/cards/SectionCard'
import { MetricCard } from '@/components/cards/MetricCard'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { cn } from '@/lib/utils/cn'
import type { Memory } from '@/lib/entities/types'

const TYPE_COLORS: Record<string, string> = {
  journal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'long-term': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  observation: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

const SOURCE_COLORS: Record<string, string> = {
  'local file': 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30',
  mem0: 'bg-green-500/20 text-green-400 border-green-500/30',
  supermemory: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10)
}

function MemoryEntry({ memory }: { memory: Memory }) {
  const typeBadge = TYPE_COLORS[memory.type] ?? TYPE_COLORS['observation']
  const sourceBadge = SOURCE_COLORS[memory.source?.toLowerCase()] ?? SOURCE_COLORS['local file']

  return (
    <div className="flex gap-3 py-3 px-4 hover:bg-zinc-800/40 transition-colors rounded-md group">
      {/* Time column */}
      <div className="w-16 shrink-0 pt-0.5">
        <span className="text-xs text-zinc-600 font-mono">{formatTime(memory.createdAt)}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
              typeBadge
            )}
          >
            {memory.type}
          </span>
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
              sourceBadge
            )}
          >
            {memory.source || 'local file'}
          </span>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">
          {memory.content?.slice(0, 200)}
          {(memory.content?.length ?? 0) > 200 ? '...' : ''}
        </p>

        {/* Entity link chips */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {memory.projectId && (
            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">
              <FolderOpen className="w-2.5 h-2.5" />
              {memory.projectId.slice(0, 8)}
            </span>
          )}
          {memory.agentId && (
            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">
              <Cpu className="w-2.5 h-2.5" />
              {memory.agentId.slice(0, 8)}
            </span>
          )}
          {memory.tags &&
            memory.tags.length > 0 &&
            memory.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}

export default function MemoryPage() {
  const { data: memories } = useLocalData<Memory>('memories')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!memories) return []
    const q = search.toLowerCase().trim()
    if (!q) return memories
    return memories.filter(
      (m) =>
        m.content?.toLowerCase().includes(q) ||
        m.type?.toLowerCase().includes(q) ||
        m.source?.toLowerCase().includes(q) ||
        m.tags?.some((t) => t.toLowerCase().includes(q))
    )
  }, [memories, search])

  // Group by day, most recent first
  const grouped = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const groups: { date: string; entries: Memory[] }[] = []
    let currentKey = ''
    for (const m of sorted) {
      const key = dayKey(m.createdAt)
      if (key !== currentKey) {
        currentKey = key
        groups.push({ date: m.createdAt, entries: [] })
      }
      groups[groups.length - 1].entries.push(m)
    }
    return groups
  }, [filtered])

  // Long-term / pinned memories
  const longTermMemories = useMemo(() => {
    if (!memories) return []
    return memories.filter((m) => m.type === 'long-term')
  }, [memories])

  // Metrics
  const totalMemories = memories?.length ?? 0
  const todayCount = useMemo(() => {
    if (!memories) return 0
    const today = new Date().toISOString().slice(0, 10)
    return memories.filter((m) => dayKey(m.createdAt) === today).length
  }, [memories])
  const uniqueTypes = useMemo(() => {
    if (!memories) return 0
    return new Set(memories.map((m) => m.type)).size
  }, [memories])

  const hasData = memories && memories.length > 0

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Memory"
        description="Browse accumulated intelligence from your OpenClaw sessions, grouped by date with source attribution."
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total Entries" value={totalMemories} />
        <MetricCard label="Today" value={todayCount} />
        <MetricCard label="Long-term" value={longTermMemories.length} />
        <MetricCard label="Types" value={uniqueTypes} />
      </div>

      {!hasData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={Brain}
            title="No memory entries found"
            description="Memory entries are indexed from your OpenClaw workspace files. Set OPENCLAW_WORKSPACE_PATH in your environment to begin indexing."
          />
        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Main timeline */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <Input
                placeholder="Search memory entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 text-sm h-9"
              />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(100vh-320px)]">
                {grouped.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-zinc-500">
                      No entries match your search.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {grouped.map((group) => (
                      <div key={dayKey(group.date)}>
                        {/* Day header */}
                        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/50 px-4 py-2 z-10">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-zinc-600" />
                            <span className="text-xs font-semibold text-zinc-400">
                              {formatDate(group.date)}
                            </span>
                            <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded-full px-1.5 py-0.5 font-medium">
                              {group.entries.length}
                            </span>
                          </div>
                        </div>
                        {/* Entries */}
                        <div className="divide-y divide-zinc-800/30">
                          {group.entries.map((memory) => (
                            <MemoryEntry key={memory.id} memory={memory} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Long-term memory sidebar */}
          {longTermMemories.length > 0 && (
            <div className="w-80 shrink-0">
              <SectionCard
                title="Long-term Memory"
                action={
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {longTermMemories.length}
                  </Badge>
                }
              >
                <ScrollArea className="max-h-[calc(100vh-380px)]">
                  <div className="space-y-3">
                    {longTermMemories.slice(0, 20).map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 bg-zinc-800/50 rounded-md border border-zinc-700/50"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Star className="w-3 h-3 text-violet-400" />
                          <span className="text-[10px] text-violet-400 font-medium">
                            Long-term
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">
                          {m.content?.slice(0, 200)}
                        </p>
                        {m.tags && m.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {m.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] text-zinc-500 bg-zinc-700/50 rounded px-1 py-0.5"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </SectionCard>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
