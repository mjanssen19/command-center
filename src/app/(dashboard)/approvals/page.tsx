'use client'

import { useState, useMemo } from 'react'
import {
  ShieldCheck,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Plus,
  Link2,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { PaperclipOfflineBanner } from '@/components/common/PaperclipOfflineBanner'
import { SourceBadge } from '@/components/common/SourceBadge'
import { usePaperclip } from '@/lib/paperclip'
import { useApprovals, useApproveApproval, useRejectApproval } from '@/lib/paperclip/hooks'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { useLocalCreate, useLocalUpdate } from '@/lib/hooks/useLocalMutations'
import { useMergedList } from '@/lib/hooks/useMergedData'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PaperclipApproval } from '@/lib/paperclip/types'
import type { DataSource } from '@/lib/entities/types'

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Pending' },
  approved: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Approved' },
  rejected: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Rejected' },
}

const TYPE_CONFIG: Record<string, { color: string }> = {
  hire: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  strategy: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  task_review: { color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  content: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  email: { color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  project_gate: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  general: { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
}

// ── Normalized display type ──

interface NormalizedApproval {
  id: string
  type: string
  status: string
  title?: string
  description?: string
  requestorAgentId?: string
  entityType?: string
  entityId?: string
  payload?: Record<string, unknown>
  createdAt: string
  resolvedAt?: string
  source: DataSource
  readonly: boolean
}

function normalizeApproval(
  data: Record<string, unknown>,
  source: DataSource,
  readonly: boolean
): NormalizedApproval {
  if (source === 'paperclip') {
    const p = data as unknown as PaperclipApproval
    return {
      id: p.id,
      type: p.type,
      status: p.status,
      requestorAgentId: p.requestedById,
      payload: p.payload,
      createdAt: p.createdAt,
      resolvedAt: p.resolvedAt,
      source,
      readonly,
    }
  }
  // Local SQLite — snake_case
  // Extract entity_type/entity_id from payload JSON or direct fields
  let entityType: string | undefined
  let entityId: string | undefined
  if (typeof data.payload === 'object' && data.payload !== null) {
    const payload = data.payload as Record<string, unknown>
    entityType = payload.entity_type ? String(payload.entity_type) : undefined
    entityId = payload.entity_id ? String(payload.entity_id) : undefined
  }
  // Direct fields take precedence
  if (data.entity_type) entityType = String(data.entity_type)
  if (data.entity_id) entityId = String(data.entity_id)

  return {
    id: String(data.id ?? ''),
    type: String(data.type ?? 'general'),
    status: String(data.status ?? 'pending'),
    title: data.title ? String(data.title) : undefined,
    description: data.description ? String(data.description) : undefined,
    requestorAgentId: data.requestor_agent_id ? String(data.requestor_agent_id) : undefined,
    entityType,
    entityId,
    payload: typeof data.payload === 'object' && data.payload !== null
      ? (data.payload as Record<string, unknown>)
      : undefined,
    createdAt: String(data.created_at ?? new Date().toISOString()),
    resolvedAt: data.resolved_at ? String(data.resolved_at) : undefined,
    source,
    readonly,
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatPayload(approval: NormalizedApproval): string {
  // For local approvals with title/description
  if (approval.title) return approval.title
  if (approval.description) return approval.description

  const payload = approval.payload
  if (!payload) return 'No details provided'
  // Try common keys for a preview
  if (payload.description && typeof payload.description === 'string') return payload.description
  if (payload.summary && typeof payload.summary === 'string') return payload.summary
  if (payload.message && typeof payload.message === 'string') return payload.message
  if (payload.title && typeof payload.title === 'string') return payload.title
  // Fallback: show first few keys
  const keys = Object.keys(payload).filter(k => k !== 'entity_type' && k !== 'entity_id').slice(0, 3)
  return keys.map((k) => `${k}: ${String(payload[k]).slice(0, 50)}`).join(', ') || 'No details provided'
}

// ── Linked entity badge ──

function LinkedEntityBadge({
  entityType,
  entityId,
  entityName,
}: {
  entityType: string
  entityId: string
  entityName?: string
}) {
  const typeLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 rounded-md text-[10px]">
      <Link2 className="w-3 h-3 text-zinc-500" />
      <span className="text-zinc-400">{typeLabel}:</span>
      <span className="text-zinc-300 font-medium">
        {entityName ?? entityId.slice(0, 12)}
      </span>
    </div>
  )
}

function ApprovalCard({
  approval,
  agentName,
  entityName,
  companyId,
}: {
  approval: NormalizedApproval
  agentName: string | undefined
  entityName: string | undefined
  companyId: string | undefined
}) {
  const [expanded, setExpanded] = useState(false)
  const statusCfg = STATUS_CONFIG[approval.status] ?? STATUS_CONFIG.pending
  const typeCfg = TYPE_CONFIG[approval.type] ?? { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' }
  const approvePaperclip = useApproveApproval(companyId)
  const rejectPaperclip = useRejectApproval(companyId)
  const updateLocal = useLocalUpdate('approvals')
  const isPending = approval.status === 'pending'

  const handleApprove = () => {
    if (approval.source === 'local') {
      updateLocal.mutate({
        id: approval.id,
        status: 'approved',
        resolved_at: new Date().toISOString(),
      })
    } else {
      approvePaperclip.mutate(approval.id)
    }
  }

  const handleReject = () => {
    if (approval.source === 'local') {
      updateLocal.mutate({
        id: approval.id,
        status: 'rejected',
        resolved_at: new Date().toISOString(),
      })
    } else {
      rejectPaperclip.mutate(approval.id)
    }
  }

  const isActionPending =
    approvePaperclip.isPending || rejectPaperclip.isPending || updateLocal.isPending

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors"
      >
        {/* Type badge */}
        <Badge
          variant="outline"
          className={cn('text-[10px] px-1.5 py-0 h-4 border shrink-0', typeCfg.color)}
        >
          {approval.type.replace(/_/g, ' ')}
        </Badge>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200 truncate">
            {formatPayload(approval)}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {agentName && (
              <span className="text-[10px] text-zinc-500">Requested by {agentName}</span>
            )}
            <span className="text-[10px] text-zinc-600">
              {relativeTime(approval.createdAt)}
            </span>
          </div>
        </div>

        {/* Linked entity indicator */}
        {approval.entityType && approval.entityId && (
          <Link2 className="w-3 h-3 text-zinc-500 shrink-0" />
        )}

        {/* Source + Status */}
        <SourceBadge source={approval.source} />
        <Badge
          variant="outline"
          className={cn('text-[10px] px-1.5 py-0 h-4 border shrink-0', statusCfg.color)}
        >
          {statusCfg.label}
        </Badge>

        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
          {/* Linked entity badge */}
          {approval.entityType && approval.entityId && (
            <div className="mb-3">
              <LinkedEntityBadge
                entityType={approval.entityType}
                entityId={approval.entityId}
                entityName={entityName}
              />
            </div>
          )}

          {/* Full details */}
          <div className="mb-3">
            <h4 className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2 font-semibold">
              Request Details
            </h4>
            {approval.title && (
              <p className="text-xs text-zinc-300 font-medium mb-1">{approval.title}</p>
            )}
            {approval.description && (
              <p className="text-xs text-zinc-400 mb-2">{approval.description}</p>
            )}
            {approval.payload ? (
              <pre className="text-xs text-zinc-400 bg-zinc-800 rounded-md p-3 overflow-x-auto max-h-48 font-mono">
                {JSON.stringify(
                  // Filter out entity_type/entity_id from display
                  Object.fromEntries(
                    Object.entries(approval.payload).filter(
                      ([k]) => k !== 'entity_type' && k !== 'entity_id'
                    )
                  ),
                  null,
                  2
                )}
              </pre>
            ) : (
              !approval.title && !approval.description && (
                <p className="text-xs text-zinc-600">No payload data available.</p>
              )
            )}
          </div>

          {/* Discussion placeholder */}
          <div className="mb-3">
            <h4 className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Discussion
            </h4>
            <p className="text-xs text-zinc-600">
              Discussion threads will be available in a future update.
            </p>
          </div>

          {/* Actions */}
          {isPending && (
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={isActionPending}
                className="bg-green-600 hover:bg-green-500 text-white text-xs h-7"
              >
                {(approvePaperclip.isPending || updateLocal.isPending) ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Check className="w-3 h-3 mr-1" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                disabled={isActionPending}
                className="text-red-400 border-red-500/30 hover:bg-red-500/10 text-xs h-7"
              >
                {rejectPaperclip.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <X className="w-3 h-3 mr-1" />
                )}
                Reject
              </Button>
            </div>
          )}

          {approval.resolvedAt && (
            <p className="text-[10px] text-zinc-600 pt-2">
              Resolved {relativeTime(approval.resolvedAt)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── New Approval Dialog ──

function NewApprovalDialog({
  open,
  onOpenChange,
  localTasks,
  localProjects,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  localTasks: Record<string, unknown>[]
  localProjects: Record<string, unknown>[]
}) {
  const [type, setType] = useState('general')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [linkedType, setLinkedType] = useState('')
  const [linkedEntityId, setLinkedEntityId] = useState('')
  const createApproval = useLocalCreate<Record<string, unknown>>('approvals')

  const linkedEntities = useMemo(() => {
    if (linkedType === 'task') {
      return localTasks.map((t) => ({
        id: String(t.id ?? ''),
        name: String(t.title ?? ''),
      }))
    }
    if (linkedType === 'project') {
      return localProjects.map((p) => ({
        id: String(p.id ?? ''),
        name: String(p.name ?? ''),
      }))
    }
    return []
  }, [linkedType, localTasks, localProjects])

  const handleSubmit = () => {
    if (!title.trim()) return
    const payload: Record<string, unknown> = {}
    if (linkedType && linkedEntityId) {
      payload.entity_type = linkedType
      payload.entity_id = linkedEntityId
    }
    createApproval.mutate(
      {
        type,
        title: title.trim(),
        description: description.trim() || '',
        status: 'pending',
        payload: JSON.stringify(payload),
        createdAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setType('general')
          setTitle('')
          setDescription('')
          setLinkedType('')
          setLinkedEntityId('')
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">New Approval</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Type</label>
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="hire">Hire</SelectItem>
                <SelectItem value="strategy">Strategy</SelectItem>
                <SelectItem value="task_review">Task Review</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="project_gate">Project Gate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Approval title..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Linked to</label>
            <Select value={linkedType} onValueChange={(v) => { if (v !== null) setLinkedType(v); setLinkedEntityId('') }}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="">None</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="content">Content</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {linkedType && linkedType !== 'content' && linkedEntities.length > 0 && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">
                Select {linkedType === 'task' ? 'Task' : 'Project'}
              </label>
              <Select value={linkedEntityId} onValueChange={(v) => v !== null && setLinkedEntityId(v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder={`Choose a ${linkedType}...`} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {linkedEntities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createApproval.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {createApproval.isPending ? (
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

export default function ApprovalsPage() {
  const { companyId, status: paperclipStatus } = usePaperclip()
  const { data: paperclipApprovals } = useApprovals(companyId)
  const { data: localApprovals } = useLocalData<Record<string, unknown>>('approvals')
  const { data: localAgents } = useLocalData<Record<string, unknown>>('agents')
  const { data: localTasks } = useLocalData<Record<string, unknown>>('issues')
  const { data: localProjects } = useLocalData<Record<string, unknown>>('projects')
  const [dialogOpen, setDialogOpen] = useState(false)

  const paperclipConnected = paperclipStatus === 'connected'

  // Merge local + Paperclip approvals
  const merged = useMergedList(localApprovals, paperclipApprovals, paperclipConnected)

  // Normalize
  const allApprovals = useMemo(() => {
    return merged.items.map((item) =>
      normalizeApproval(item.data as Record<string, unknown>, item.source, item.readonly)
    )
  }, [merged.items])

  const hasNoData = allApprovals.length === 0

  // Agent map from local agents (primary) — no Paperclip agents dependency
  const agentMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (localAgents) {
      for (const a of localAgents) {
        map[String(a.id ?? '')] = String(a.name ?? '')
      }
    }
    return map
  }, [localAgents])

  // Entity name lookup map (tasks + projects)
  const entityNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (localTasks) {
      for (const t of localTasks) {
        map[`task:${String(t.id ?? '')}`] = String(t.title ?? '')
      }
    }
    if (localProjects) {
      for (const p of localProjects) {
        map[`project:${String(p.id ?? '')}`] = String(p.name ?? '')
      }
    }
    return map
  }, [localTasks, localProjects])

  const pendingApprovals = allApprovals.filter((a) => a.status === 'pending')

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Review and action pending approval requests from your agents before important work proceeds."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Approval
          </Button>
        }
      />

      <PaperclipOfflineBanner />

      {hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={ShieldCheck}
            title="No approvals pending"
            description="Create an approval request or wait for agents to submit them. Approvals from Paperclip will also appear here when connected."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Approval
              </Button>
            }
          />
        </div>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 mb-4">
            <TabsTrigger value="pending" className="text-xs">
              Pending ({pendingApprovals.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              All ({allApprovals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingApprovals.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                <EmptyState
                  icon={ShieldCheck}
                  title="All caught up"
                  description="No pending approval requests. Check the All tab to see resolved approvals."
                />
              </div>
            ) : (
              <div className="space-y-2">
                {pendingApprovals.map((approval) => (
                  <ApprovalCard
                    key={`${approval.source}-${approval.id}`}
                    approval={approval}
                    agentName={approval.requestorAgentId ? agentMap[approval.requestorAgentId] : undefined}
                    entityName={
                      approval.entityType && approval.entityId
                        ? entityNameMap[`${approval.entityType}:${approval.entityId}`]
                        : undefined
                    }
                    companyId={companyId}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="space-y-2">
              {allApprovals.map((approval) => (
                <ApprovalCard
                  key={`${approval.source}-${approval.id}`}
                  approval={approval}
                  agentName={approval.requestorAgentId ? agentMap[approval.requestorAgentId] : undefined}
                  entityName={
                    approval.entityType && approval.entityId
                      ? entityNameMap[`${approval.entityType}:${approval.entityId}`]
                      : undefined
                  }
                  companyId={companyId}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <NewApprovalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        localTasks={localTasks ?? []}
        localProjects={localProjects ?? []}
      />
    </div>
  )
}
