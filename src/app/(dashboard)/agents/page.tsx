'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Bot,
  Heart,
  Clock,
  DollarSign,
  Cpu,
  ArrowLeft,
  Play,
  CircleCheck,
  CircleX,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { PaperclipOfflineBanner } from '@/components/common/PaperclipOfflineBanner'
import { usePaperclip } from '@/lib/paperclip'
import { useAgents, useAgentRuns } from '@/lib/paperclip/hooks'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PaperclipAgent } from '@/lib/paperclip/types'

const STATUS_CONFIG: Record<string, { color: string; dotColor: string; label: string }> = {
  active: { color: 'bg-green-500/10 text-green-400 border-green-500/20', dotColor: 'bg-green-500', label: 'Active' },
  paused: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dotColor: 'bg-amber-500', label: 'Paused' },
  error: { color: 'bg-red-500/10 text-red-400 border-red-500/20', dotColor: 'bg-red-500', label: 'Error' },
  offline: { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', dotColor: 'bg-zinc-500', label: 'Offline' },
}

const RUN_STATUS_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  completed: { icon: CircleCheck, color: 'text-green-500' },
  failed: { icon: CircleX, color: 'text-red-500' },
  running: { icon: Loader2, color: 'text-blue-500' },
  queued: { icon: Clock, color: 'text-zinc-500' },
  cancelled: { icon: CircleX, color: 'text-zinc-500' },
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return 'Never'
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function AgentCard({
  agent,
  onClick,
}: {
  agent: PaperclipAgent
  onClick: () => void
}) {
  const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.offline

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 hover:bg-zinc-800/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
          {agent.iconUrl ? (
            <Image src={agent.iconUrl} alt={agent.name} width={40} height={40} className="w-10 h-10 rounded-lg" />
          ) : (
            <span className="text-sm font-bold text-zinc-400">
              {agent.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-medium text-zinc-200 truncate">{agent.name}</h3>
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0 h-4 border', statusCfg.color)}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full mr-1', statusCfg.dotColor)} />
              {statusCfg.label}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mb-2 truncate">{agent.role}</p>

          {/* Info row */}
          <div className="flex items-center gap-3 text-[10px] text-zinc-600 flex-wrap">
            {agent.lastHeartbeatAt && (
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {relativeTime(agent.lastHeartbeatAt)}
              </span>
            )}
            {agent.modelProvider && (
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {agent.modelProvider}/{agent.modelName ?? 'unknown'}
              </span>
            )}
            {agent.monthlySpend !== undefined && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${agent.monthlySpend.toFixed(2)}/mo
              </span>
            )}
          </div>

          {/* Current task */}
          {agent.currentTaskId && (
            <div className="mt-2 px-2 py-1 bg-zinc-800 rounded text-[10px] text-zinc-400 truncate">
              Working on: {agent.currentTaskId.slice(0, 12)}...
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function AgentDetail({
  agent,
  companyId,
  onBack,
}: {
  agent: PaperclipAgent
  companyId: string | undefined
  onBack: () => void
}) {
  const { data: runs } = useAgentRuns(companyId, agent.id)
  const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.offline

  return (
    <div>
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="text-zinc-500 hover:text-zinc-300 mb-4 -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        Back to agents
      </Button>

      {/* Agent header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
            {agent.iconUrl ? (
              <Image src={agent.iconUrl} alt={agent.name} width={56} height={56} className="w-14 h-14 rounded-lg" />
            ) : (
              <span className="text-xl font-bold text-zinc-400">
                {agent.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-zinc-100">{agent.name}</h2>
              <Badge
                variant="outline"
                className={cn('text-xs px-2 py-0.5 border', statusCfg.color)}
              >
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-sm text-zinc-400 mb-3">{agent.role}</p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                  Heartbeat
                </p>
                <p className="text-xs text-zinc-300">
                  {relativeTime(agent.lastHeartbeatAt)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Model</p>
                <p className="text-xs text-zinc-300">
                  {agent.modelProvider ?? 'Unknown'}/{agent.modelName ?? 'unknown'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                  Adapter
                </p>
                <p className="text-xs text-zinc-300">{agent.adapterType}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                  Monthly Cost
                </p>
                <p className="text-xs text-zinc-300">
                  {agent.monthlySpend !== undefined
                    ? `$${agent.monthlySpend.toFixed(2)}`
                    : 'N/A'}
                  {agent.monthlyBudget !== undefined && (
                    <span className="text-zinc-600"> / ${agent.monthlyBudget.toFixed(2)}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent runs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Play className="w-3.5 h-3.5 text-zinc-500" />
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Recent Runs
          </h3>
        </div>
        {!runs || runs.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-zinc-600">No runs recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {runs.slice(0, 15).map((run) => {
              const runCfg = RUN_STATUS_ICONS[run.status] ?? RUN_STATUS_ICONS.queued
              const RunIcon = runCfg.icon
              return (
                <div key={run.id} className="px-4 py-2.5 flex items-center gap-3">
                  <RunIcon
                    className={cn(
                      'w-4 h-4 shrink-0',
                      runCfg.color,
                      run.status === 'running' && 'animate-spin'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">
                      Run {run.id.slice(0, 8)}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {run.startedAt ? relativeTime(run.startedAt) : 'Queued'}
                      {run.finishedAt && ` — finished ${relativeTime(run.finishedAt)}`}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5 py-0 h-4', runCfg.color)}
                  >
                    {run.status}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const { companyId, status: paperclipStatus } = usePaperclip()
  const { data: agents } = useAgents(companyId)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  const isOffline = paperclipStatus === 'disconnected'
  const hasNoData = !agents || agents.length === 0

  const selectedAgent = agents?.find((a) => a.id === selectedAgentId)

  if (selectedAgent) {
    return (
      <div>
        <AgentDetail
          agent={selectedAgent}
          companyId={companyId}
          onBack={() => setSelectedAgentId(null)}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Monitor autonomous agent status, heartbeat health, and runtime sessions."
      />

      <PaperclipOfflineBanner />

      {isOffline && hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={Bot}
            title="Paperclip is offline"
            description="Agents are managed through Paperclip. Connect to Paperclip to view your agent fleet."
          />
        </div>
      ) : hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={Bot}
            title="No agents discovered"
            description="Agents will appear here once Paperclip is connected and running. Configure your Paperclip API URL in the environment settings."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => setSelectedAgentId(agent.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
