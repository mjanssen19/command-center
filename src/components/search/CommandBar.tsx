'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import {
  CheckSquare,
  FolderKanban,
  Bot,
  FileText,
  Brain,
  ShieldCheck,
  Calendar,
  User,
  Plus,
  ClipboardCheck,
  BookOpen,
  Sparkles,
  Monitor,
  ArrowRight,
} from 'lucide-react'
import {
  search,
  groupResults,
  GROUP_ORDER,
  TYPE_LABELS,
  type SearchResult,
} from '@/lib/search/command-bar'

const TYPE_ICONS: Record<SearchResult['type'], React.ElementType> = {
  task: CheckSquare,
  project: FolderKanban,
  agent: Bot,
  document: FileText,
  memory: Brain,
  schedule: Calendar,
  approval: ShieldCheck,
  person: User,
}

interface ActionShortcut {
  id: string
  label: string
  icon: React.ElementType
  url: string
}

const ACTION_SHORTCUTS: ActionShortcut[] = [
  { id: 'new-task', label: 'New Task', icon: Plus, url: '/tasks' },
  { id: 'review-approvals', label: 'Review Approvals', icon: ClipboardCheck, url: '/approvals' },
  { id: 'open-docs', label: 'Open Latest Doc', icon: BookOpen, url: '/docs' },
  { id: 'todays-memory', label: "Today's Memory", icon: Sparkles, url: '/memory' },
  { id: 'view-calendar', label: 'View Calendar', icon: Calendar, url: '/calendar' },
  { id: 'system-status', label: 'System Status', icon: Monitor, url: '/system' },
]

interface CommandBarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!query || query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await search(query)
        setResults(res)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setLoading(false)
    }
  }, [open])

  const handleSelect = useCallback(
    (url: string) => {
      onOpenChange(false)
      router.push(url)
    },
    [onOpenChange, router]
  )

  const grouped = groupResults(results)
  const hasResults = results.length > 0
  const showActions = !query

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command Bar"
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-start justify-center pt-[20vh]">
        <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-zinc-800">
            <svg
              className="w-4 h-4 text-zinc-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search everything or jump to..."
              className="flex-1 h-12 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 outline-none border-0"
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin shrink-0" />
            )}
            <kbd className="text-[10px] text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5 font-sans shrink-0">
              ESC
            </kbd>
          </div>

          {/* Results / Actions */}
          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-zinc-500">
              {query.length >= 2 ? 'No results found.' : 'Start typing to search...'}
            </Command.Empty>

            {/* Action shortcuts (shown when no query) */}
            {showActions && (
              <Command.Group
                heading="Quick Actions"
                className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {ACTION_SHORTCUTS.map((action) => {
                  const Icon = action.icon
                  return (
                    <Command.Item
                      key={action.id}
                      value={action.label}
                      onSelect={() => handleSelect(action.url)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-zinc-300 data-[selected=true]:bg-zinc-800 data-[selected=true]:text-zinc-100 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="text-sm flex-1">{action.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600 opacity-0 data-[selected=true]:opacity-100 transition-opacity" />
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}

            {/* Search results grouped by type */}
            {hasResults &&
              GROUP_ORDER.map((type) => {
                const items = grouped.get(type)
                if (!items || items.length === 0) return null
                const Icon = TYPE_ICONS[type]
                return (
                  <Command.Group
                    key={type}
                    heading={TYPE_LABELS[type] + 's'}
                    className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:mt-2"
                  >
                    {items.map((result) => (
                      <Command.Item
                        key={`${result.type}-${result.id}`}
                        value={`${result.title} ${result.subtitle ?? ''}`}
                        onSelect={() => handleSelect(result.url)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-zinc-300 data-[selected=true]:bg-zinc-800 data-[selected=true]:text-zinc-100 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-zinc-500 truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5 shrink-0 font-medium">
                          {TYPE_LABELS[result.type]}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )
              })}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-zinc-800">
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <kbd className="border border-zinc-700 rounded px-1 py-0.5 font-sans">↑↓</kbd>
              navigate
            </span>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <kbd className="border border-zinc-700 rounded px-1 py-0.5 font-sans">↵</kbd>
              select
            </span>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <kbd className="border border-zinc-700 rounded px-1 py-0.5 font-sans">esc</kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </Command.Dialog>
  )
}
