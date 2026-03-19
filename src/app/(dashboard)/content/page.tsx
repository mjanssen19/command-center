'use client'

import { useState, useMemo } from 'react'
import {
  Plus,
  FileText,
  Mail,
  MessageSquare,
  Newspaper,
  Filter,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
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
import type { ContentItem } from '@/lib/entities/types'

// ── Constants ──

const PIPELINE_COLUMNS = [
  { key: 'idea', label: 'Idea', color: 'bg-zinc-500' },
  { key: 'draft', label: 'Draft', color: 'bg-blue-500' },
  { key: 'review', label: 'Review', color: 'bg-amber-500' },
  { key: 'scheduled', label: 'Scheduled', color: 'bg-purple-500' },
  { key: 'published', label: 'Published', color: 'bg-green-500' },
] as const

const CONTENT_TYPES = [
  { value: 'post', label: 'Post', icon: FileText },
  { value: 'newsletter', label: 'Newsletter', icon: Mail },
  { value: 'thread', label: 'Thread', icon: MessageSquare },
  { value: 'article', label: 'Article', icon: Newspaper },
] as const

const TYPE_BADGE_COLORS: Record<string, string> = {
  post: 'bg-blue-900/50 text-blue-300',
  newsletter: 'bg-purple-900/50 text-purple-300',
  thread: 'bg-amber-900/50 text-amber-300',
  article: 'bg-green-900/50 text-green-300',
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

// ── Content Card ──

function ContentCard({ item }: { item: ContentItem }) {
  const TypeIcon = CONTENT_TYPES.find((t) => t.value === item.type)?.icon ?? FileText

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors group">
      <div className="flex items-start gap-2 mb-1.5">
        <TypeIcon className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
        <p className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2 group-hover:text-zinc-100">
          {item.title}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-6 flex-wrap">
        <span
          className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded',
            TYPE_BADGE_COLORS[item.type] ?? 'bg-zinc-700 text-zinc-300'
          )}
        >
          {item.type}
        </span>
        {item.channel && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {item.channel}
          </Badge>
        )}
        {item.linkedAgent && (
          <span className="text-[10px] text-zinc-600">{item.linkedAgent}</span>
        )}
        <span className="text-[10px] text-zinc-600 ml-auto">
          {relativeTime(item.createdAt)}
        </span>
      </div>
    </div>
  )
}

// ── Pipeline Column ──

function PipelineColumn({
  label,
  color,
  items,
}: {
  label: string
  color: string
  items: ContentItem[]
}) {
  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('w-2 h-2 rounded-full', color)} />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded-full px-1.5 py-0.5 font-medium">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-[200px]">
        {items.length === 0 ? (
          <div className="flex-1 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center">
            <p className="text-xs text-zinc-600">No items</p>
          </div>
        ) : (
          items.map((item) => <ContentCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}

// ── State Flow ──

function ContentFlowIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 mb-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[11px] text-zinc-500 overflow-x-auto">
      <span className="font-medium text-zinc-400">Content pipeline:</span>
      <span className="flex items-center gap-1 ml-2">
        {PIPELINE_COLUMNS.map((col, i) => (
          <span key={col.key} className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1">
              <span className={cn('w-1.5 h-1.5 rounded-full', col.color)} />
              {col.label}
            </span>
            {i < PIPELINE_COLUMNS.length - 1 && (
              <ArrowRight className="w-3 h-3 text-zinc-700" />
            )}
          </span>
        ))}
      </span>
    </div>
  )
}

// ── New Idea Dialog ──

function NewIdeaDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('post')
  const [channel, setChannel] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const handleSubmit = async () => {
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      await fetch('/api/local/content_items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          status: 'idea',
          channel: channel.trim() || 'general',
          body: description.trim(),
          createdAt: new Date().toISOString(),
        }),
      })
      queryClient.invalidateQueries({ queryKey: ['local', 'content_items'] })
      setTitle('')
      setType('post')
      setChannel('')
      setDescription('')
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
          <DialogTitle className="text-zinc-100">New Idea</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Content title..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Type</label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {CONTENT_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Channel</label>
              <Input
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="e.g. twitter, blog"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your idea..."
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
            disabled={!title.trim() || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-1" />
            )}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──

export default function ContentPage() {
  const { data: items } = useLocalData<ContentItem>('content_items')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')

  const filteredItems = useMemo(() => {
    if (!items) return []
    if (filterType === 'all') return items
    return items.filter((item) => item.type === filterType)
  }, [items, filterType])

  const columnItems = useMemo(() => {
    const map: Record<string, ContentItem[]> = {}
    for (const col of PIPELINE_COLUMNS) {
      map[col.key] = []
    }
    for (const item of filteredItems) {
      const key = item.status ?? 'idea'
      if (map[key]) map[key].push(item)
      else if (map['idea']) map['idea'].push(item)
    }
    return map
  }, [filteredItems])

  const totalItems = items?.length ?? 0

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Content"
        description="Pipeline for ideas, drafts, reviews, and published content."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Idea
          </Button>
        }
      />

      <ContentFlowIndicator />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-3.5 h-3.5 text-zinc-500" />
        <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
          <SelectTrigger className="w-[140px] h-7 text-xs bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Types</SelectItem>
            {CONTENT_TYPES.map((ct) => (
              <SelectItem key={ct.value} value={ct.value}>
                {ct.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline */}
      {totalItems === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={FileText}
            title="No content yet"
            description="Start your content pipeline by adding your first idea. Track content from ideation through to publication."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Idea
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex gap-4 flex-1 overflow-x-auto pb-2">
          {PIPELINE_COLUMNS.map((col) => (
            <PipelineColumn
              key={col.key}
              label={col.label}
              color={col.color}
              items={columnItems[col.key] ?? []}
            />
          ))}
        </div>
      )}

      <NewIdeaDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
