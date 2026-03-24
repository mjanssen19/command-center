'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Search,
  Download,
  GitFork,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldAlert,
  ShieldX,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils/cn'
import {
  useClawHubSkills,
  useClawHubSearch,
  useClawHubSkill,
  useClawHubVersions,
  useClawHubFile,
} from '@/lib/clawhub/hooks'
import type { ClawHubSkill, ClawHubSearchResult } from '@/lib/clawhub/types'

type SortMode = 'trending' | 'downloads' | 'updated'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'downloads', label: 'Popular' },
  { value: 'updated', label: 'Recent' },
]

function relativeTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  const days = Math.floor(diff / 86_400_000)
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function ModerationBadge({ verdict, isSuspicious, isMalwareBlocked }: { verdict: string; isSuspicious: boolean; isMalwareBlocked: boolean }) {
  if (isMalwareBlocked) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-950/50 border border-red-900/50 rounded px-1.5 py-0.5">
        <ShieldX className="w-3 h-3" />
        Blocked
      </span>
    )
  }
  if (isSuspicious) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-950/50 border border-amber-900/50 rounded px-1.5 py-0.5">
        <ShieldAlert className="w-3 h-3" />
        Suspicious
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-900/50 rounded px-1.5 py-0.5">
      <Shield className="w-3 h-3" />
      {verdict || 'Clean'}
    </span>
  )
}

function SkillListItem({
  slug,
  displayName,
  summary,
  version,
  updatedAt,
  selected,
  onClick,
}: {
  slug: string
  displayName: string
  summary: string
  version?: string
  updatedAt: number
  selected: boolean
  onClick: () => void
}) {
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
        <Package className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{displayName}</p>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{slug}</p>
        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">{summary}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {version && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
              v{version}
            </Badge>
          )}
          <span className="text-[10px] text-zinc-600">{relativeTime(updatedAt)}</span>
        </div>
      </div>
    </button>
  )
}

function SkillDetail({ slug }: { slug: string }) {
  const { data: detail, isLoading, error } = useClawHubSkill(slug)
  const { data: versions } = useClawHubVersions(slug)
  const { data: skillMd, isLoading: loadingMd } = useClawHubFile(slug)

  const [installState, setInstallState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [installMessage, setInstallMessage] = useState('')
  const [analyzeState, setAnalyzeState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [forkState, setForkState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [versionsOpen, setVersionsOpen] = useState(false)

  const handleInstall = useCallback(async () => {
    setInstallState('loading')
    try {
      const res = await fetch('/api/clawhub/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (data.success) {
        setInstallState('success')
        setInstallMessage('Installed successfully')
      } else {
        setInstallState('error')
        setInstallMessage(data.error || 'Installation failed')
      }
    } catch {
      setInstallState('error')
      setInstallMessage('Network error')
    }
  }, [slug])

  const handleCreateTask = useCallback(async (type: 'analyze' | 'fork') => {
    const setState = type === 'analyze' ? setAnalyzeState : setForkState
    setState('loading')

    try {
      const mdContent = skillMd || '(SKILL.md content not available)'
      const displayName = detail?.skill?.displayName || slug

      const taskData = type === 'analyze'
        ? {
            title: `Analyze skill: ${displayName}`,
            description: `Review this ClawHub skill for security, quality, and usefulness before installing.\n\n## Skill: ${displayName} (${slug})\n\n${mdContent}`,
            status: 'backlog',
            priority: 'medium',
          }
        : {
            title: `Create skill based on: ${displayName}`,
            description: `Create a new skill inspired by this one. Copy the functionality but rewrite it as your own version. Save the new skill to the workspace.\n\n## Original Skill: ${displayName} (${slug})\n\n${mdContent}`,
            status: 'backlog',
            priority: 'medium',
          }

      const res = await fetch('/api/local/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })

      if (res.ok) {
        setState('success')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }, [slug, skillMd, detail])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load skill"
          description="Could not fetch skill details from the ClawHub registry."
        />
      </div>
    )
  }

  if (!detail) return null

  const skill = detail.skill
  const owner = detail.owner
  const moderation = detail.moderation
  const version = detail.latestVersion?.version || skill.latestVersion?.version
  const osList = detail.metadata?.os || skill.metadata?.os
  const versionItems = versions?.items || []

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-zinc-100">{skill.displayName}</h3>
          {version && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              v{version}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span>{skill.slug}</span>
          {owner && (
            <>
              <span className="text-zinc-700">by</span>
              <span className="text-zinc-400">{owner.displayName || owner.handle}</span>
            </>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {osList && osList.length > 0 && osList.map((os) => (
            <span key={os} className="text-[10px] text-zinc-400 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">
              {os}
            </span>
          ))}
          {moderation && (
            <ModerationBadge
              verdict={moderation.verdict}
              isSuspicious={moderation.isSuspicious}
              isMalwareBlocked={moderation.isMalwareBlocked}
            />
          )}
          <span className="text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">
            MIT-0
          </span>
        </div>

        {/* Summary */}
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{skill.summary}</p>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={installState === 'loading'}
            className="bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 text-xs gap-1"
          >
            {installState === 'loading' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : installState === 'success' ? (
              <CheckCircle className="w-3 h-3" />
            ) : installState === 'error' ? (
              <XCircle className="w-3 h-3" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            Install on Server
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCreateTask('analyze')}
            disabled={analyzeState === 'loading'}
            className="text-xs gap-1 border-amber-800/50 text-amber-400 hover:bg-amber-950/30 hover:text-amber-300"
          >
            {analyzeState === 'loading' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : analyzeState === 'success' ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <Search className="w-3 h-3" />
            )}
            Analyze with Agent
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCreateTask('fork')}
            disabled={forkState === 'loading'}
            className="text-xs gap-1"
          >
            {forkState === 'loading' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : forkState === 'success' ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <GitFork className="w-3 h-3" />
            )}
            Create My Version
          </Button>
        </div>

        {/* Install feedback */}
        {installState === 'success' && (
          <p className="text-[11px] text-emerald-400 mt-1.5">{installMessage}</p>
        )}
        {installState === 'error' && (
          <p className="text-[11px] text-red-400 mt-1.5">{installMessage}</p>
        )}
        {analyzeState === 'success' && (
          <p className="text-[11px] text-emerald-400 mt-1.5">
            Task created.{' '}
            <a href="/tasks" className="underline hover:text-emerald-300">View in Tasks</a>
          </p>
        )}
        {forkState === 'success' && (
          <p className="text-[11px] text-emerald-400 mt-1.5">
            Task created.{' '}
            <a href="/tasks" className="underline hover:text-emerald-300">View in Tasks</a>
          </p>
        )}
      </div>

      {/* Content area */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* SKILL.md content */}
          {loadingMd ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading SKILL.md...
            </div>
          ) : skillMd ? (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-a:text-indigo-400 prose-code:text-zinc-300 prose-code:bg-zinc-800 prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{skillMd}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 italic">SKILL.md not available</p>
          )}

          {/* Version history */}
          {versionItems.length > 0 && (
            <div className="mt-6 border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => setVersionsOpen(!versionsOpen)}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                {versionsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Version History ({versionItems.length})
              </button>
              {versionsOpen && (
                <div className="mt-2 space-y-2">
                  {versionItems.map((v) => (
                    <div key={v.version} className="bg-zinc-800/50 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                          v{v.version}
                        </Badge>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {relativeTime(v.createdAt)}
                        </span>
                      </div>
                      {v.changelog && (
                        <p className="text-[11px] text-zinc-400 mt-1">{v.changelog}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* External link */}
          <div className="mt-6 border-t border-zinc-800 pt-4">
            <a
              href={`https://clawhub.ai/skills/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View on ClawHub
            </a>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export default function ClawHubPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('trending')
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isSearching = debouncedSearch.length > 0
  const { data: skillsData, isLoading: loadingSkills, error: skillsError } = useClawHubSkills(sort)
  const { data: searchData, isLoading: loadingSearch, error: searchError } = useClawHubSearch(debouncedSearch)

  const skills = skillsData?.items || []
  const searchResults = searchData?.results || []
  const isLoading = isSearching ? loadingSearch : loadingSkills
  const hasError = isSearching ? searchError : skillsError

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="ClawHub"
        description="Browse, search, and install skills from the ClawHub registry."
      />

      <div className="flex gap-0 flex-1 min-h-0 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {/* Left panel — Skill list */}
        <div className="w-96 shrink-0 border-r border-zinc-800 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-zinc-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <Input
                placeholder="Search ClawHub skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm h-8"
              />
            </div>

            {/* Sort tabs */}
            {!isSearching && (
              <div className="flex gap-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSort(opt.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                      sort === opt.value
                        ? 'bg-zinc-700 text-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Skill list */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
            ) : hasError ? (
              <div className="p-6">
                <EmptyState
                  icon={AlertTriangle}
                  title="Unable to reach ClawHub registry"
                  description="Check your internet connection and try again."
                />
              </div>
            ) : isSearching ? (
              searchResults.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-zinc-500">No skills found matching your search.</p>
                </div>
              ) : (
                <div>
                  {searchResults.map((result: ClawHubSearchResult) => (
                    <SkillListItem
                      key={result.slug}
                      slug={result.slug}
                      displayName={result.displayName}
                      summary={result.summary}
                      version={result.version}
                      updatedAt={result.updatedAt}
                      selected={result.slug === selectedSlug}
                      onClick={() => setSelectedSlug(result.slug)}
                    />
                  ))}
                </div>
              )
            ) : skills.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-zinc-500">No skills available.</p>
              </div>
            ) : (
              <div>
                {skills.map((skill: ClawHubSkill) => (
                  <SkillListItem
                    key={skill.slug}
                    slug={skill.slug}
                    displayName={skill.displayName}
                    summary={skill.summary}
                    version={skill.latestVersion?.version}
                    updatedAt={skill.updatedAt}
                    selected={skill.slug === selectedSlug}
                    onClick={() => setSelectedSlug(skill.slug)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="px-3 py-2 border-t border-zinc-800">
            <span className="text-[10px] text-zinc-600">
              {isSearching
                ? `${searchResults.length} search results`
                : `${skills.length} skills`}
            </span>
          </div>
        </div>

        {/* Right panel — Detail */}
        {selectedSlug ? (
          <SkillDetail key={selectedSlug} slug={selectedSlug} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Package className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Select a skill from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
