'use client'

import { useState, useMemo } from 'react'
import {
  FileText,
  Search,
  FileJson,
  FileCode,
  File,
  ArrowUpDown,
  FolderOpen,
  Clock,
  HardDrive,
  Tag,
  ExternalLink,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { MetricCard } from '@/components/cards/MetricCard'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { cn } from '@/lib/utils/cn'
import type { Document } from '@/lib/entities/types'

type SortField = 'title' | 'mtime' | 'size'

function getFileType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return ext
}

function FileTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'md':
      return <FileText className={className} />
    case 'json':
      return <FileJson className={className} />
    case 'yaml':
    case 'yml':
      return <FileCode className={className} />
    default:
      return <File className={className} />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  const days = Math.floor(diff / 86_400_000)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function DocListItem({
  doc,
  selected,
  onClick,
}: {
  doc: Document
  selected: boolean
  onClick: () => void
}) {
  const fileType = getFileType(doc.path)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors border-b border-zinc-800/50',
        selected
          ? 'bg-zinc-800/80 border-l-2 border-l-indigo-500'
          : 'hover:bg-zinc-800/40 border-l-2 border-l-transparent'
      )}
    >
      <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
        <FileTypeIcon type={fileType} className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{doc.title || doc.path.split('/').pop()}</p>
        <p className="text-[11px] text-zinc-600 truncate mt-0.5">{doc.path}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-zinc-500">{formatFileSize(doc.size)}</span>
          <span className="text-[10px] text-zinc-500">{relativeTime(doc.mtime)}</span>
          <span className="text-[10px] text-zinc-500 uppercase font-medium">{fileType}</span>
        </div>
        {Array.isArray(doc.tags) && doc.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {doc.tags.slice(0, 3).map((tag) => (
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
    </button>
  )
}

function DocPreview({ doc }: { doc: Document | null }) {
  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Select a document to preview</p>
        </div>
      </div>
    )
  }

  const fileType = getFileType(doc.path)
  const isMarkdown = fileType === 'md'
  const isCode = ['json', 'yaml', 'yml'].includes(fileType)
  const content = doc.summary || ''

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Preview header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-medium text-zinc-200 truncate">
            {doc.title || doc.path.split('/').pop()}
          </h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 uppercase">
            {fileType}
          </Badge>
        </div>
      </div>

      {/* Preview content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {content ? (
            isMarkdown ? (
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-a:text-indigo-400 prose-code:text-zinc-300 prose-code:bg-zinc-800 prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : isCode ? (
              <pre className="bg-zinc-800 border border-zinc-700 rounded-md p-4 text-xs text-zinc-300 overflow-x-auto font-mono whitespace-pre-wrap">
                {content}
              </pre>
            ) : (
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{content}</pre>
            )
          ) : (
            <p className="text-sm text-zinc-500 italic">Preview not available</p>
          )}
        </div>
      </ScrollArea>

      {/* Metadata panel */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-3 h-3 text-zinc-600" />
            <span className="text-[11px] text-zinc-500 truncate" title={doc.path}>
              {doc.path}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-3 h-3 text-zinc-600" />
            <span className="text-[11px] text-zinc-500">{formatFileSize(doc.size)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-zinc-600" />
            <span className="text-[11px] text-zinc-500">Indexed {relativeTime(doc.indexedAt)}</span>
          </div>
          {doc.projectId && (
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3 h-3 text-zinc-600" />
              <span className="text-[11px] text-zinc-500">
                Project: {doc.projectId.slice(0, 8)}
              </span>
            </div>
          )}
          {Array.isArray(doc.tags) && doc.tags.length > 0 && (
            <div className="flex items-center gap-2 col-span-2">
              <Tag className="w-3 h-3 text-zinc-600" />
              <div className="flex gap-1 flex-wrap">
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DocsPage() {
  const { data: documents } = useLocalData<Document>('documents')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortField>('mtime')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!documents) return []
    let result = [...documents]

    // Search filter
    const q = search.toLowerCase().trim()
    if (q) {
      result = result.filter(
        (d) =>
          d.title?.toLowerCase().includes(q) ||
          d.path?.toLowerCase().includes(q) ||
          (Array.isArray(d.tags) && d.tags.some((t) => t.toLowerCase().includes(q)))
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((d) => getFileType(d.path) === typeFilter)
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
      if (sortBy === 'size') return b.size - a.size
      return new Date(b.mtime).getTime() - new Date(a.mtime).getTime()
    })

    return result
  }, [documents, search, typeFilter, sortBy])

  const selectedDoc = useMemo(() => {
    return filtered.find((d) => d.id === selectedId) ?? null
  }, [filtered, selectedId])

  // Metrics
  const totalDocs = documents?.length ?? 0
  const totalSize = useMemo(() => {
    if (!documents) return 0
    return documents.reduce((sum, d) => sum + (d.size || 0), 0)
  }, [documents])
  const fileTypes = useMemo(() => {
    if (!documents) return 0
    return new Set(documents.map((d) => getFileType(d.path))).size
  }, [documents])

  const hasData = documents && documents.length > 0

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Docs"
        description="Search, filter, and preview locally generated OpenClaw documents with full-text search and markdown rendering."
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Documents" value={totalDocs} />
        <MetricCard label="Total Size" value={formatFileSize(totalSize)} />
        <MetricCard label="File Types" value={fileTypes} />
        <MetricCard label="Filtered" value={filtered.length} />
      </div>

      {!hasData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={FileText}
            title="No documents indexed yet"
            description="Documents are scanned from your OpenClaw workspace. Set OPENCLAW_WORKSPACE_PATH in your environment to begin indexing."
          />
        </div>
      ) : (
        <div className="flex gap-0 flex-1 min-h-0 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {/* Left panel — File list */}
          <div className="w-96 shrink-0 border-r border-zinc-800 flex flex-col">
            {/* Search + filters */}
            <div className="p-3 border-b border-zinc-800 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm h-8"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
                  <SelectTrigger className="flex-1 h-7 text-xs bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="md">Markdown</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="yaml">YAML</SelectItem>
                    <SelectItem value="txt">Text</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as SortField)}>
                  <SelectTrigger className="flex-1 h-7 text-xs bg-zinc-800 border-zinc-700">
                    <ArrowUpDown className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="mtime">Date</SelectItem>
                    <SelectItem value="title">Name</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Document list */}
            <ScrollArea className="flex-1">
              {filtered.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-zinc-500">No documents match your filters.</p>
                </div>
              ) : (
                <div>
                  {filtered.map((doc) => (
                    <DocListItem
                      key={doc.id}
                      doc={doc}
                      selected={doc.id === selectedId}
                      onClick={() => setSelectedId(doc.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="px-3 py-2 border-t border-zinc-800">
              <span className="text-[10px] text-zinc-600">
                {filtered.length} of {totalDocs} documents
              </span>
            </div>
          </div>

          {/* Right panel — Preview */}
          <DocPreview doc={selectedDoc} />
        </div>
      )}
    </div>
  )
}
