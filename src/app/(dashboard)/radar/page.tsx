'use client'

import { useState, useMemo } from 'react'
import {
  Plus,
  Radio,
  Filter,
  Loader2,
  AlertTriangle,
  ArrowUp,
  Minus,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { MetricCard } from '@/components/cards/MetricCard'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RadarSignal } from '@/lib/entities/types'

// ── Constants ──

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-900/50 text-red-300',
  medium: 'bg-amber-900/50 text-amber-300',
  low: 'bg-zinc-700 text-zinc-400',
}

const PRIORITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  high: AlertTriangle,
  medium: ArrowUp,
  low: Minus,
}

// ── Helpers ──

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

// ── Signal Card ──

function SignalCard({ signal }: { signal: RadarSignal }) {
  const PriorityIcon = PRIORITY_ICONS[signal.priority] ?? Minus

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            signal.priority === 'high'
              ? 'bg-red-900/30'
              : signal.priority === 'medium'
                ? 'bg-amber-900/30'
                : 'bg-zinc-800'
          )}
        >
          <PriorityIcon
            className={cn(
              'w-4 h-4',
              signal.priority === 'high'
                ? 'text-red-400'
                : signal.priority === 'medium'
                  ? 'text-amber-400'
                  : 'text-zinc-500'
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-zinc-200 truncate">{signal.topic}</p>
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0',
                PRIORITY_COLORS[signal.priority] ?? 'bg-zinc-700 text-zinc-400'
              )}
            >
              {signal.priority}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-2">
            {signal.summary}
          </p>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {signal.source}
            </Badge>
            <span className="text-[10px] text-zinc-600">
              {relativeTime(signal.detectedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add Signal Dialog ──

function AddSignalDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [topic, setTopic] = useState('')
  const [source, setSource] = useState('')
  const [summary, setSummary] = useState('')
  const [priority, setPriority] = useState('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const handleSubmit = async () => {
    if (!topic.trim() || !summary.trim()) return
    setIsSubmitting(true)
    try {
      await fetch('/api/local/radar_signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          source: source.trim() || 'manual',
          summary: summary.trim(),
          priority,
          detectedAt: new Date().toISOString(),
        }),
      })
      queryClient.invalidateQueries({ queryKey: ['local', 'radar_signals'] })
      setTopic('')
      setSource('')
      setSummary('')
      setPriority('medium')
      onOpenChange(false)
    } catch {
      // silently fail
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Add Signal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Topic</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Signal topic..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Source</label>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. twitter, news"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Priority</label>
              <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Summary</label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe the signal..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200 min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!topic.trim() || !summary.trim() || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-1" />
            )}
            Add Signal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──

export default function RadarPage() {
  const { data: signals } = useLocalData<RadarSignal>('radar_signals')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'none' | 'topic' | 'source'>('none')

  const filteredSignals = useMemo(() => {
    if (!signals) return []
    if (filterPriority === 'all') return signals
    return signals.filter((s) => s.priority === filterPriority)
  }, [signals, filterPriority])

  const groupedSignals = useMemo(() => {
    if (groupBy === 'none') return null
    const map: Record<string, RadarSignal[]> = {}
    for (const s of filteredSignals) {
      const key = groupBy === 'topic' ? s.topic : s.source
      if (!map[key]) map[key] = []
      map[key].push(s)
    }
    return map
  }, [filteredSignals, groupBy])

  const totalSignals = signals?.length ?? 0
  const highCount = signals?.filter((s) => s.priority === 'high').length ?? 0
  const mediumCount = signals?.filter((s) => s.priority === 'medium').length ?? 0

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Radar"
        description="Monitored trends, signals, and opportunities."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Signal
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard label="Total Signals" value={totalSignals} />
        <MetricCard label="High Priority" value={highCount} trend={highCount > 0 ? 'up' : 'neutral'} />
        <MetricCard label="Medium Priority" value={mediumCount} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-3.5 h-3.5 text-zinc-500" />
        <Select value={filterPriority} onValueChange={(v) => v && setFilterPriority(v)}>
          <SelectTrigger className="w-[130px] h-7 text-xs bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(v) => v && setGroupBy(v as 'none' | 'topic' | 'source')}>
          <SelectTrigger className="w-[130px] h-7 text-xs bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="none">No Grouping</SelectItem>
            <SelectItem value="topic">By Topic</SelectItem>
            <SelectItem value="source">By Source</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Signals */}
      {totalSignals === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={Radio}
            title="No signals detected"
            description="Add signals to track trends, opportunities, and competitive intelligence. Agents can also create signals during monitoring routines."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Signal
              </Button>
            }
          />
        </div>
      ) : groupedSignals ? (
        <div className="space-y-4 flex-1 overflow-y-auto pb-2">
          {Object.entries(groupedSignals).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">
                {group} ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto pb-2">
          {filteredSignals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      )}

      <AddSignalDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
