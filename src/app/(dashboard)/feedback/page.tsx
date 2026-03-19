'use client'

import { useState, useMemo } from 'react'
import {
  Plus,
  MessageSquare,
  Filter,
  Loader2,
  XCircle,
  FileText,
  AlertOctagon,
  Star,
  ChevronDown,
  ChevronUp,
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
import type { FeedbackItem } from '@/lib/entities/types'

// ── Constants ──

const FEEDBACK_TYPES = [
  { value: 'rejected-output', label: 'Rejected Output', icon: XCircle, color: 'bg-red-900/50 text-red-300' },
  { value: 'review-note', label: 'Review Note', icon: FileText, color: 'bg-blue-900/50 text-blue-300' },
  { value: 'post-mortem', label: 'Post-Mortem', icon: AlertOctagon, color: 'bg-amber-900/50 text-amber-300' },
  { value: 'user-rating', label: 'User Rating', icon: Star, color: 'bg-violet-900/50 text-violet-300' },
] as const

const TYPE_MAP = Object.fromEntries(FEEDBACK_TYPES.map((t) => [t.value, t]))

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

// ── Feedback Card ──

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const [expanded, setExpanded] = useState(false)
  const typeInfo = TYPE_MAP[item.type]
  const Icon = typeInfo?.icon ?? MessageSquare
  const colorClass = typeInfo?.color ?? 'bg-zinc-700 text-zinc-400'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              item.type === 'rejected-output'
                ? 'bg-red-900/30'
                : item.type === 'post-mortem'
                  ? 'bg-amber-900/30'
                  : item.type === 'user-rating'
                    ? 'bg-violet-900/30'
                    : 'bg-blue-900/30'
            )}
          >
            <Icon
              className={cn(
                'w-4 h-4',
                item.type === 'rejected-output'
                  ? 'text-red-400'
                  : item.type === 'post-mortem'
                    ? 'text-amber-400'
                    : item.type === 'user-rating'
                      ? 'text-violet-400'
                      : 'text-blue-400'
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0',
                  colorClass
                )}
              >
                {typeInfo?.label ?? item.type}
              </span>
              {item.agentId && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  Agent: {item.agentId.slice(0, 8)}
                </Badge>
              )}
              <span className="text-[10px] text-zinc-600 ml-auto shrink-0">
                {relativeTime(item.timestamp)}
              </span>
            </div>
            <p className={cn('text-xs text-zinc-400 leading-relaxed', !expanded && 'line-clamp-2')}>
              {item.content}
            </p>
            {item.entityType && item.entityId && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-zinc-600">
                  Linked: {item.entityType} #{item.entityId.slice(0, 8)}
                </span>
              </div>
            )}
          </div>
          <div className="shrink-0 text-zinc-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-zinc-800">
          <div className="mt-3 space-y-2">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Full Content</span>
              <p className="text-xs text-zinc-300 leading-relaxed mt-1 whitespace-pre-wrap">
                {item.content}
              </p>
            </div>
            {item.agentId && (
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Agent ID</span>
                <p className="text-xs text-zinc-400 mt-1">{item.agentId}</p>
              </div>
            )}
            {item.entityType && item.entityId && (
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Linked Entity</span>
                <p className="text-xs text-zinc-400 mt-1">
                  {item.entityType} &middot; {item.entityId}
                </p>
              </div>
            )}
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Timestamp</span>
              <p className="text-xs text-zinc-400 mt-1">
                {new Date(item.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Feedback Dialog ──

function AddFeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [type, setType] = useState('review-note')
  const [content, setContent] = useState('')
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const handleSubmit = async () => {
    if (!content.trim()) return
    setIsSubmitting(true)
    try {
      await fetch('/api/local/feedback_items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content: content.trim(),
          entityType: entityType.trim() || undefined,
          entityId: entityId.trim() || undefined,
          agentId: agentId.trim() || undefined,
          timestamp: new Date().toISOString(),
        }),
      })
      queryClient.invalidateQueries({ queryKey: ['local', 'feedback_items'] })
      setContent('')
      setEntityType('')
      setEntityId('')
      setAgentId('')
      setType('review-note')
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
          <DialogTitle className="text-zinc-100">Add Feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Type</label>
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {FEEDBACK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the feedback..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200 min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Entity Type (optional)</label>
              <Input
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                placeholder="e.g. task, document"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Entity ID (optional)</label>
              <Input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="ID of linked entity"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Agent ID (optional)</label>
            <Input
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="ID of related agent"
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-1" />
            )}
            Add Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──

export default function FeedbackPage() {
  const { data: items } = useLocalData<FeedbackItem>('feedback_items')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')

  const filteredItems = useMemo(() => {
    if (!items) return []
    if (filterType === 'all') return items
    return items.filter((i) => i.type === filterType)
  }, [items, filterType])

  const totalItems = items?.length ?? 0
  const rejectedCount = items?.filter((i) => i.type === 'rejected-output').length ?? 0
  const postMortemCount = items?.filter((i) => i.type === 'post-mortem').length ?? 0
  const reviewCount = items?.filter((i) => i.type === 'review-note').length ?? 0

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Feedback"
        description="Collect agent self-critique, rejected outputs, post-mortems, review notes, and quality ratings."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Feedback
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total Feedback" value={totalItems} />
        <MetricCard label="Rejected Outputs" value={rejectedCount} trend={rejectedCount > 0 ? 'up' : 'neutral'} />
        <MetricCard label="Post-Mortems" value={postMortemCount} />
        <MetricCard label="Review Notes" value={reviewCount} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-3.5 h-3.5 text-zinc-500" />
        <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
          <SelectTrigger className="w-[160px] h-7 text-xs bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Types</SelectItem>
            {FEEDBACK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Feedback List */}
      {totalItems === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={MessageSquare}
            title="No feedback recorded"
            description="Feedback items capture rejection reasons, post-mortems, review notes, and agent self-critique. Add feedback manually or let agents create it during task workflows."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Feedback
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto pb-2">
          {filteredItems.map((item) => (
            <FeedbackCard key={item.id} item={item} />
          ))}
          {filteredItems.length === 0 && filterType !== 'all' && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No {TYPE_MAP[filterType]?.label ?? filterType} feedback found.
            </div>
          )}
        </div>
      )}

      <AddFeedbackDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
