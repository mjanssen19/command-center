'use client'

import { useState, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Plus,
  Users,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  MessageSquare,
  FolderPlus,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityLink } from '@/components/common/EntityLink'
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
import { useLocalData } from '@/lib/hooks/useLocalData'
import { useLocalCreate, useLocalUpdate } from '@/lib/hooks/useLocalMutations'

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

// ── Position Badge ──

const POSITION_COLORS: Record<string, string> = {
  for: 'bg-green-900/50 text-green-300',
  against: 'bg-red-900/50 text-red-300',
  neutral: 'bg-zinc-700 text-zinc-300',
}

// ── Normalized types ──

interface NormalizedProposal {
  id: string
  title: string
  description: string
  status: string
  recommendation: string
  createdAt: string
  resolvedAt?: string
}

interface DebateEntry {
  id: string
  agentName: string
  position: string
  argument: string
  timestamp: string
}

function normalizeProposal(data: Record<string, unknown>): NormalizedProposal {
  return {
    id: String(data.id ?? ''),
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    status: String(data.status ?? 'open'),
    recommendation: String(data.recommendation ?? ''),
    createdAt: String(data.created_at ?? new Date().toISOString()),
    resolvedAt: data.resolved_at ? String(data.resolved_at) : undefined,
  }
}

function normalizeDebateEntry(data: Record<string, unknown>): DebateEntry {
  // Debate entries stored as activity_events with JSON summary
  const summaryStr = String(data.summary ?? '{}')
  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(summaryStr)
  } catch {
    // fallback: treat summary as the argument itself
    parsed = { argument: summaryStr }
  }
  return {
    id: String(data.id ?? ''),
    agentName: String(parsed.agentName ?? data.agent_id ?? 'Unknown'),
    position: String(parsed.position ?? 'neutral'),
    argument: String(parsed.argument ?? ''),
    timestamp: String(data.timestamp ?? new Date().toISOString()),
  }
}

// ── Proposal Card ──

function ProposalCard({
  proposal,
  debateEntries,
  isExpanded,
  onToggle,
  onAddDebate,
  onResolve,
  linkedProjectId,
  linkedProjectName,
  onCreateProject,
  isCreatingProject,
}: {
  proposal: NormalizedProposal
  debateEntries: DebateEntry[]
  isExpanded: boolean
  onToggle: () => void
  onAddDebate: (proposalId: string, entry: { agentName: string; position: string; argument: string }) => void
  onResolve: (proposalId: string, recommendation: string) => void
  linkedProjectId?: string
  linkedProjectName?: string
  onCreateProject: (proposalId: string) => void
  isCreatingProject: boolean
}) {
  const [showDebateForm, setShowDebateForm] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [position, setPosition] = useState<'for' | 'against' | 'neutral'>('neutral')
  const [argument, setArgument] = useState('')
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [recommendation, setRecommendation] = useState('')

  const handleAddDebate = () => {
    if (!agentName.trim() || !argument.trim()) return
    onAddDebate(proposal.id, {
      agentName: agentName.trim(),
      position,
      argument: argument.trim(),
    })
    setAgentName('')
    setPosition('neutral')
    setArgument('')
    setShowDebateForm(false)
  }

  const handleResolve = () => {
    if (!recommendation.trim()) return
    onResolve(proposal.id, recommendation.trim())
    setRecommendation('')
    setShowResolveForm(false)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-200 truncate">{proposal.title}</p>
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px] px-1.5 py-0 h-4',
                proposal.status === 'open'
                  ? 'bg-amber-900/50 text-amber-300'
                  : 'bg-green-900/50 text-green-300'
              )}
            >
              {proposal.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {relativeTime(proposal.createdAt)}
            </span>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {debateEntries.length} arguments
            </span>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {new Set(debateEntries.map((e) => e.agentName)).size} participants
            </span>
            {linkedProjectId && linkedProjectName && (
              <EntityLink
                type="project"
                id={linkedProjectId}
                label={linkedProjectName}
              />
            )}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-zinc-800">
          {/* Description */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Description
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">{proposal.description}</p>
          </div>

          {/* Recommendation (if resolved) */}
          {proposal.status === 'resolved' && proposal.recommendation && (
            <div className="px-4 py-3 border-b border-zinc-800 bg-green-950/20">
              <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Recommendation
              </p>
              <p className="text-xs text-zinc-300 leading-relaxed">{proposal.recommendation}</p>

              {/* Create Project from Proposal button */}
              <div className="mt-3 flex items-center gap-2">
                {linkedProjectId && linkedProjectName ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">Project created:</span>
                    <EntityLink
                      type="project"
                      id={linkedProjectId}
                      label={linkedProjectName}
                    />
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateProject(proposal.id)
                    }}
                    disabled={isCreatingProject}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-7"
                  >
                    {isCreatingProject ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <FolderPlus className="w-3 h-3 mr-1" />
                    )}
                    Create Project from Proposal
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Debate entries */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Debate ({debateEntries.length})
            </p>
            {debateEntries.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-3">
                No arguments yet. Add the first one.
              </p>
            ) : (
              <div className="space-y-2">
                {debateEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 p-2 bg-zinc-800/50 rounded-md"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-white">
                        {entry.agentName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-300">
                          {entry.agentName}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] font-medium px-1.5 py-0 rounded',
                            POSITION_COLORS[entry.position] ?? POSITION_COLORS.neutral
                          )}
                        >
                          {entry.position}
                        </span>
                        <span className="text-[10px] text-zinc-600 ml-auto">
                          {relativeTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                        {entry.argument}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add debate entry form */}
            {proposal.status === 'open' && (
              <div className="mt-3">
                {showDebateForm ? (
                  <div className="space-y-2 p-3 bg-zinc-800/30 rounded-lg border border-zinc-800">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="Agent name..."
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs h-8"
                      />
                      <select
                        value={position}
                        onChange={(e) =>
                          setPosition(e.target.value as 'for' | 'against' | 'neutral')
                        }
                        className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs h-8 rounded-md px-2"
                      >
                        <option value="for">For</option>
                        <option value="against">Against</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                    <Textarea
                      value={argument}
                      onChange={(e) => setArgument(e.target.value)}
                      placeholder="Argument..."
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs min-h-[60px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDebateForm(false)}
                        className="text-zinc-400 h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddDebate}
                        disabled={!agentName.trim() || !argument.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white h-7 text-xs"
                      >
                        Add Argument
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDebateForm(true)}
                      className="text-zinc-400 h-7 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Argument
                    </Button>
                    {!showResolveForm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResolveForm(true)}
                        className="text-green-400 hover:text-green-300 h-7 text-xs"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                )}
                {showResolveForm && !showDebateForm && (
                  <div className="space-y-2 mt-2 p-3 bg-green-950/20 rounded-lg border border-green-900/30">
                    <Textarea
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                      placeholder="Final recommendation..."
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs min-h-[60px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResolveForm(false)}
                        className="text-zinc-400 h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleResolve}
                        disabled={!recommendation.trim()}
                        className="bg-green-700 hover:bg-green-600 text-white h-7 text-xs"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Resolve Proposal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── New Proposal Dialog ──

function NewProposalDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const createProposal = useLocalCreate<Record<string, unknown>>('council_proposals')

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return
    createProposal.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        status: 'open',
        recommendation: '',
        createdAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setTitle('')
          setDescription('')
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">New Proposal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Proposal title..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the proposal..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200 min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || createProposal.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {createProposal.isPending ? (
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

export default function CouncilPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-zinc-500">Loading...</div>}>
      <CouncilPageContent />
    </Suspense>
  )
}

function CouncilPageContent() {
  const searchParams = useSearchParams()
  const selectedParam = searchParams.get('selected')

  const { data: proposals } = useLocalData<Record<string, unknown>>('council_proposals')
  const { data: activityEvents } = useLocalData<Record<string, unknown>>('activity_events')
  const { data: entityLinks } = useLocalData<Record<string, unknown>>('entity_links')
  const { data: projects } = useLocalData<Record<string, unknown>>('projects')

  const createActivity = useLocalCreate<Record<string, unknown>>('activity_events')
  const createEntityLink = useLocalCreate<Record<string, unknown>>('entity_links')
  const createProject = useLocalCreate<Record<string, unknown>>('projects')
  const updateProposal = useLocalUpdate('council_proposals')

  const [expandedId, setExpandedId] = useState<string | null>(selectedParam)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all')
  const [creatingProjectFor, setCreatingProjectFor] = useState<string | null>(null)

  // Normalize proposals
  const allProposals = useMemo(() => {
    if (!proposals) return []
    return proposals.map(normalizeProposal)
  }, [proposals])

  // Build debate entries per proposal from activity_events
  const debateEntriesByProposal = useMemo(() => {
    const map: Record<string, DebateEntry[]> = {}
    if (activityEvents) {
      for (const ev of activityEvents) {
        if (String(ev.entity_type ?? '') === 'council_proposal' && String(ev.type ?? '') === 'debate_entry') {
          const proposalId = String(ev.entity_id ?? '')
          if (!map[proposalId]) map[proposalId] = []
          map[proposalId].push(normalizeDebateEntry(ev))
        }
      }
    }
    // Sort by timestamp
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }
    return map
  }, [activityEvents])

  // Build linked project map from entity_links
  const linkedProjectMap = useMemo(() => {
    const map: Record<string, { projectId: string; projectName: string }> = {}
    if (entityLinks && projects) {
      const projectNameMap: Record<string, string> = {}
      for (const p of projects) {
        projectNameMap[String(p.id ?? '')] = String(p.name ?? '')
      }
      for (const link of entityLinks) {
        if (
          String(link.from_type ?? '') === 'council_proposal' &&
          String(link.to_type ?? '') === 'project'
        ) {
          const proposalId = String(link.from_id ?? '')
          const projectId = String(link.to_id ?? '')
          map[proposalId] = {
            projectId,
            projectName: projectNameMap[projectId] ?? projectId.slice(0, 8),
          }
        }
      }
    }
    return map
  }, [entityLinks, projects])

  const handleAddDebate = useCallback(
    (proposalId: string, entry: { agentName: string; position: string; argument: string }) => {
      createActivity.mutate({
        type: 'debate_entry',
        entityType: 'council_proposal',
        entityId: proposalId,
        summary: JSON.stringify(entry),
        timestamp: new Date().toISOString(),
      })
    },
    [createActivity]
  )

  const handleResolve = useCallback(
    (proposalId: string, recommendation: string) => {
      updateProposal.mutate({
        id: proposalId,
        status: 'resolved',
        recommendation,
        resolved_at: new Date().toISOString(),
      })
      createActivity.mutate({
        type: 'proposal_resolved',
        entityType: 'council_proposal',
        entityId: proposalId,
        summary: `Proposal resolved with recommendation: ${recommendation.slice(0, 100)}`,
        timestamp: new Date().toISOString(),
      })
    },
    [updateProposal, createActivity]
  )

  const handleCreateProject = useCallback(
    (proposalId: string) => {
      const proposal = allProposals.find((p) => p.id === proposalId)
      if (!proposal) return
      setCreatingProjectFor(proposalId)

      createProject.mutate(
        {
          name: proposal.title,
          description: proposal.description,
          status: 'planning',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          onSuccess: (data) => {
            const newProjectId = data.id
            // Create entity link
            createEntityLink.mutate({
              fromType: 'council_proposal',
              fromId: proposalId,
              toType: 'project',
              toId: newProjectId,
              relationship: 'created_from',
              confidence: 1.0,
            })
            // Log activity
            createActivity.mutate({
              type: 'project_created_from_proposal',
              entityType: 'council_proposal',
              entityId: proposalId,
              summary: `Project '${proposal.title}' created from council proposal`,
              timestamp: new Date().toISOString(),
            })
            setCreatingProjectFor(null)
          },
          onError: () => {
            setCreatingProjectFor(null)
          },
        }
      )
    },
    [allProposals, createProject, createEntityLink, createActivity]
  )

  const filteredProposals = useMemo(() => {
    if (filterStatus === 'all') return allProposals
    return allProposals.filter((p) => p.status === filterStatus)
  }, [allProposals, filterStatus])

  const openCount = allProposals.filter((p) => p.status === 'open').length
  const resolvedCount = allProposals.filter((p) => p.status === 'resolved').length

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Council"
        description="Multi-agent decision surface for proposals, debates, and recommendations."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Proposal
          </Button>
        }
      />

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={cn(
            'text-xs px-2 py-1 rounded transition-colors',
            filterStatus === 'all' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          All ({allProposals.length})
        </button>
        <button
          onClick={() => setFilterStatus('open')}
          className={cn(
            'text-xs px-2 py-1 rounded transition-colors',
            filterStatus === 'open'
              ? 'bg-amber-900/30 text-amber-300'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setFilterStatus('resolved')}
          className={cn(
            'text-xs px-2 py-1 rounded transition-colors',
            filterStatus === 'resolved'
              ? 'bg-green-900/30 text-green-300'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Proposals */}
      {filteredProposals.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={Users}
            title="No proposals"
            description="Create a proposal to start a structured debate. Agents can contribute arguments for, against, or neutral positions before reaching a recommendation."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Proposal
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pb-2">
          {filteredProposals.map((proposal) => {
            const linked = linkedProjectMap[proposal.id]
            return (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                debateEntries={debateEntriesByProposal[proposal.id] ?? []}
                isExpanded={expandedId === proposal.id}
                onToggle={() =>
                  setExpandedId(expandedId === proposal.id ? null : proposal.id)
                }
                onAddDebate={handleAddDebate}
                onResolve={handleResolve}
                linkedProjectId={linked?.projectId}
                linkedProjectName={linked?.projectName}
                onCreateProject={handleCreateProject}
                isCreatingProject={creatingProjectFor === proposal.id}
              />
            )
          })}
        </div>
      )}

      <NewProposalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
