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
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { PaperclipOfflineBanner } from '@/components/common/PaperclipOfflineBanner'
import { usePaperclip } from '@/lib/paperclip'
import { useApprovals, useApproveApproval, useRejectApproval, useAgents } from '@/lib/paperclip/hooks'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PaperclipApproval } from '@/lib/paperclip/types'

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

function formatPayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) return 'No details provided'
  // Try common keys for a preview
  if (payload.description && typeof payload.description === 'string') return payload.description
  if (payload.summary && typeof payload.summary === 'string') return payload.summary
  if (payload.message && typeof payload.message === 'string') return payload.message
  if (payload.title && typeof payload.title === 'string') return payload.title
  // Fallback: show first few keys
  const keys = Object.keys(payload).slice(0, 3)
  return keys.map((k) => `${k}: ${String(payload[k]).slice(0, 50)}`).join(', ')
}

function ApprovalCard({
  approval,
  agentName,
  companyId,
}: {
  approval: PaperclipApproval
  agentName: string | undefined
  companyId: string | undefined
}) {
  const [expanded, setExpanded] = useState(false)
  const statusCfg = STATUS_CONFIG[approval.status] ?? STATUS_CONFIG.pending
  const typeCfg = TYPE_CONFIG[approval.type] ?? { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' }
  const approve = useApproveApproval(companyId)
  const reject = useRejectApproval(companyId)
  const isPending = approval.status === 'pending'

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
            {formatPayload(approval.payload)}
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

        {/* Status */}
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
          {/* Full payload */}
          <div className="mb-3">
            <h4 className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2 font-semibold">
              Request Details
            </h4>
            {approval.payload ? (
              <pre className="text-xs text-zinc-400 bg-zinc-800 rounded-md p-3 overflow-x-auto max-h-48 font-mono">
                {JSON.stringify(approval.payload, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-zinc-600">No payload data available.</p>
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
                onClick={() => approve.mutate(approval.id)}
                disabled={approve.isPending || reject.isPending}
                className="bg-green-600 hover:bg-green-500 text-white text-xs h-7"
              >
                {approve.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Check className="w-3 h-3 mr-1" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => reject.mutate(approval.id)}
                disabled={approve.isPending || reject.isPending}
                className="text-red-400 border-red-500/30 hover:bg-red-500/10 text-xs h-7"
              >
                {reject.isPending ? (
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

export default function ApprovalsPage() {
  const { companyId, status: paperclipStatus } = usePaperclip()
  const { data: approvals } = useApprovals(companyId)
  const { data: agents } = useAgents(companyId)

  const isOffline = paperclipStatus === 'disconnected'
  const hasNoData = !approvals || approvals.length === 0

  const agentMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (agents) {
      for (const a of agents) {
        map[a.id] = a.name
      }
    }
    return map
  }, [agents])

  const pendingApprovals = approvals?.filter((a) => a.status === 'pending') ?? []
  const allApprovals = approvals ?? []

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Review and action pending approval requests from your agents before important work proceeds."
      />

      <PaperclipOfflineBanner />

      {isOffline && hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={ShieldCheck}
            title="Paperclip is offline"
            description="Approvals are managed through Paperclip. Connect to Paperclip to view pending requests."
          />
        </div>
      ) : hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={ShieldCheck}
            title="No approvals yet"
            description="Approval requests from agents will appear here. Agents can request review before sending drafts, publishing content, or completing project gates."
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
                    key={approval.id}
                    approval={approval}
                    agentName={approval.requestedById ? agentMap[approval.requestedById] : undefined}
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
                  key={approval.id}
                  approval={approval}
                  agentName={approval.requestedById ? agentMap[approval.requestedById] : undefined}
                  companyId={companyId}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
