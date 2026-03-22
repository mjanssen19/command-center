'use client'

import { useState, useMemo } from 'react'
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
  Plus,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { PaperclipOfflineBanner } from '@/components/common/PaperclipOfflineBanner'
import { SourceBadge } from '@/components/common/SourceBadge'
import { usePaperclip } from '@/lib/paperclip'
import { useAgents, useAgentRuns } from '@/lib/paperclip/hooks'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { useLocalCreate } from '@/lib/hooks/useLocalMutations'
import { useMergedList } from '@/lib/hooks/useMergedData'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { PaperclipAgent } from '@/lib/paperclip/types'
import type { DataSource } from '@/lib/entities/types'

const STATUS_CONFIG: Record<string, { color: string; dotColor: string; label: string }> = {
  active: { color: 'bg-green-500/10 text-green-400 border-green-500/20', dotColor: 'bg-green-500', label: 'Active' },
  idle: { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', dotColor: 'bg-zinc-500', label: 'Idle' },
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

// ── Normalized display type ──

interface NormalizedAgent {
  id: string
  name: string
  role: string
  status: string
  model?: string
  provider?: string
  adapterType?: string
  iconUrl?: string
  lastHeartbeat?: string
  monthlySpend?: number
  monthlyBudget?: number
  currentTaskId?: string
  source: DataSource
  readonly: boolean
}

function normalizeAgent(
  data: Record<string, unknown>,
  source: DataSource,
  readonly: boolean
): NormalizedAgent {
  if (source === 'paperclip') {
    const p = data as unknown as PaperclipAgent
    return {
      id: p.id,
      name: p.name,
      role: p.role,
      status: p.status,
      model: p.modelName,
      provider: p.modelProvider,
      adapterType: p.adapterType,
      iconUrl: p.iconUrl,
      lastHeartbeat: p.lastHeartbeatAt,
      monthlySpend: p.monthlySpend,
      monthlyBudget: p.monthlyBudget,
      currentTaskId: p.currentTaskId,
      source,
      readonly,
    }
  }
  // Local SQLite — snake_case
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
    role: String(data.role ?? ''),
    status: String(data.status ?? 'idle'),
    model: data.model ? String(data.model) : undefined,
    provider: data.provider ? String(data.provider) : undefined,
    adapterType: data.adapter_type ? String(data.adapter_type) : undefined,
    lastHeartbeat: data.last_heartbeat_at ? String(data.last_heartbeat_at) : undefined,
    source,
    readonly,
  }
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
  agent: NormalizedAgent
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
            <SourceBadge source={agent.source} />
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
            {agent.lastHeartbeat && (
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {relativeTime(agent.lastHeartbeat)}
              </span>
            )}
            {agent.provider && (
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {agent.provider}/{agent.model ?? 'unknown'}
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
  agent: NormalizedAgent
  companyId: string | undefined
  onBack: () => void
}) {
  // Only fetch runs for Paperclip agents
  const { data: runs } = useAgentRuns(
    agent.source === 'paperclip' ? companyId : undefined,
    agent.source === 'paperclip' ? agent.id : undefined
  )
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
              <SourceBadge source={agent.source} />
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
                  {relativeTime(agent.lastHeartbeat)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Model</p>
                <p className="text-xs text-zinc-300">
                  {agent.provider ?? 'Unknown'}/{agent.model ?? 'unknown'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                  Adapter
                </p>
                <p className="text-xs text-zinc-300">{agent.adapterType ?? 'N/A'}</p>
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

      {/* Recent runs (Paperclip agents only) */}
      {agent.source === 'paperclip' && (
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
      )}

      {/* Local agent info */}
      {agent.source === 'local' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Local Agent
          </h3>
          <p className="text-xs text-zinc-500">
            This agent is registered locally. Runs and heartbeat data are not available for local agents.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Register Agent Dialog ──

function RegisterAgentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [model, setModel] = useState('')
  const [provider, setProvider] = useState('')
  const [status, setStatus] = useState('active')
  const createAgent = useLocalCreate<Record<string, unknown>>('agents')

  const handleSubmit = () => {
    if (!name.trim()) return
    createAgent.mutate(
      {
        name: name.trim(),
        role: role.trim() || 'assistant',
        model: model.trim() || '',
        provider: provider.trim() || '',
        status,
        adapterType: 'local',
        source: 'local',
        createdAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setName('')
          setRole('')
          setModel('')
          setProvider('')
          setStatus('active')
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Register Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Agent name..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Role</label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. code-reviewer, writer, researcher..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Provider</label>
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. anthropic, openai..."
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Model</label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. claude-3.5-sonnet..."
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Status</label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createAgent.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {createAgent.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-1" />
            )}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AgentsPage() {
  const { companyId, status: paperclipStatus } = usePaperclip()
  const { data: paperclipAgents } = useAgents(companyId)
  const { data: localAgents } = useLocalData<Record<string, unknown>>('agents')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const paperclipConnected = paperclipStatus === 'connected'

  // Merge local + Paperclip agents
  const merged = useMergedList(localAgents, paperclipAgents, paperclipConnected)

  // Normalize
  const allAgents = useMemo(() => {
    return merged.items.map((item) =>
      normalizeAgent(item.data as Record<string, unknown>, item.source, item.readonly)
    )
  }, [merged.items])

  const hasNoData = allAgents.length === 0

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId || !selectedSource) return null
    return allAgents.find((a) => a.id === selectedAgentId && a.source === selectedSource) ?? null
  }, [allAgents, selectedAgentId, selectedSource])

  if (selectedAgent) {
    return (
      <div>
        <AgentDetail
          agent={selectedAgent}
          companyId={companyId}
          onBack={() => {
            setSelectedAgentId(null)
            setSelectedSource(null)
          }}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Monitor autonomous agent status, heartbeat health, and runtime sessions."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Register Agent
          </Button>
        }
      />

      <PaperclipOfflineBanner />

      {hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={Bot}
            title="No agents registered"
            description="Register your first agent to get started. Agents from Paperclip will also appear here when connected."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Register Agent
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {allAgents.map((agent) => (
            <AgentCard
              key={`${agent.source}-${agent.id}`}
              agent={agent}
              onClick={() => {
                setSelectedAgentId(agent.id)
                setSelectedSource(agent.source)
              }}
            />
          ))}
        </div>
      )}

      <RegisterAgentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
