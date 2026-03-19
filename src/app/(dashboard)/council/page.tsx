'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Users,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
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

// ── Types ──

interface DebateEntry {
  id: string
  agentName: string
  position: 'for' | 'against' | 'neutral'
  argument: string
  timestamp: string
}

interface Proposal {
  id: string
  title: string
  description: string
  status: 'open' | 'resolved'
  recommendation?: string
  debateEntries: DebateEntry[]
  createdAt: string
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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ── localStorage Helpers ──

function loadProposals(): Proposal[] {
  try {
    const raw = localStorage.getItem('council_proposals')
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return []
}

function saveProposals(proposals: Proposal[]) {
  try {
    localStorage.setItem('council_proposals', JSON.stringify(proposals))
  } catch {
    // ignore
  }
}

// ── Position Badge ──

const POSITION_COLORS: Record<string, string> = {
  for: 'bg-green-900/50 text-green-300',
  against: 'bg-red-900/50 text-red-300',
  neutral: 'bg-zinc-700 text-zinc-300',
}

// ── Proposal Card ──

function ProposalCard({
  proposal,
  isExpanded,
  onToggle,
  onAddDebate,
  onResolve,
}: {
  proposal: Proposal
  isExpanded: boolean
  onToggle: () => void
  onAddDebate: (proposalId: string, entry: Omit<DebateEntry, 'id' | 'timestamp'>) => void
  onResolve: (proposalId: string, recommendation: string) => void
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
              {proposal.debateEntries.length} arguments
            </span>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {new Set(proposal.debateEntries.map((e) => e.agentName)).size} participants
            </span>
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
            </div>
          )}

          {/* Debate entries */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Debate ({proposal.debateEntries.length})
            </p>
            {proposal.debateEntries.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-3">
                No arguments yet. Add the first one.
              </p>
            ) : (
              <div className="space-y-2">
                {proposal.debateEntries.map((entry) => (
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
                            POSITION_COLORS[entry.position]
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
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (title: string, description: string) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return
    onSubmit(title.trim(), description.trim())
    setTitle('')
    setDescription('')
    onOpenChange(false)
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
            disabled={!title.trim() || !description.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──

export default function CouncilPage() {
  const [proposals, setProposals] = useState<Proposal[]>(() => {
    if (typeof window === 'undefined') return []
    return loadProposals()
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all')
  const mounted = typeof window !== 'undefined'

  const persist = useCallback((updated: Proposal[]) => {
    setProposals(updated)
    saveProposals(updated)
  }, [])

  const handleNewProposal = useCallback(
    (title: string, description: string) => {
      const newProposal: Proposal = {
        id: generateId(),
        title,
        description,
        status: 'open',
        debateEntries: [],
        createdAt: new Date().toISOString(),
      }
      persist([newProposal, ...proposals])
    },
    [proposals, persist]
  )

  const handleAddDebate = useCallback(
    (proposalId: string, entry: Omit<DebateEntry, 'id' | 'timestamp'>) => {
      const updated = proposals.map((p) => {
        if (p.id !== proposalId) return p
        return {
          ...p,
          debateEntries: [
            ...p.debateEntries,
            { ...entry, id: generateId(), timestamp: new Date().toISOString() },
          ],
        }
      })
      persist(updated)
    },
    [proposals, persist]
  )

  const handleResolve = useCallback(
    (proposalId: string, recommendation: string) => {
      const updated = proposals.map((p) => {
        if (p.id !== proposalId) return p
        return { ...p, status: 'resolved' as const, recommendation }
      })
      persist(updated)
    },
    [proposals, persist]
  )

  const filteredProposals = useMemo(() => {
    if (filterStatus === 'all') return proposals
    return proposals.filter((p) => p.status === filterStatus)
  }, [proposals, filterStatus])

  const openCount = proposals.filter((p) => p.status === 'open').length
  const resolvedCount = proposals.filter((p) => p.status === 'resolved').length

  if (!mounted) return null

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
          All ({proposals.length})
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
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              isExpanded={expandedId === proposal.id}
              onToggle={() =>
                setExpandedId(expandedId === proposal.id ? null : proposal.id)
              }
              onAddDebate={handleAddDebate}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}

      <NewProposalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleNewProposal}
      />
    </div>
  )
}
