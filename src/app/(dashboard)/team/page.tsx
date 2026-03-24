'use client'

import { useState, useMemo } from 'react'
import {
  Network,
  Bot,
  Heart,
  Cpu,
  Edit3,
  Save,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { SourceBadge } from '@/components/common/SourceBadge'
import { usePaperclip } from '@/lib/paperclip'
import { useOrgChart, useAgents } from '@/lib/paperclip/hooks'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { PaperclipOrgNode } from '@/lib/paperclip/types'

// ── Types ──

interface TeamAgent {
  id: string
  name: string
  emoji?: string
  role: string
  model: string
  provider: string
  status: string
  adapterType: string
  workspace?: string
  lastHeartbeat?: string
  source: 'local' | 'scanner' | 'paperclip'
}

const STATUS_CONFIG: Record<string, { dotColor: string; label: string }> = {
  active: { dotColor: 'bg-green-500', label: 'Active' },
  idle: { dotColor: 'bg-blue-400', label: 'Idle' },
  paused: { dotColor: 'bg-amber-500', label: 'Paused' },
  error: { dotColor: 'bg-red-500', label: 'Error' },
  offline: { dotColor: 'bg-zinc-500', label: 'Offline' },
}

// ── Helpers ──

const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u

function extractEmoji(role: string): { emoji: string | undefined; cleanRole: string } {
  const match = role.match(EMOJI_RE)
  if (match) {
    return { emoji: match[0], cleanRole: role.slice(match[0].length).trim() }
  }
  return { emoji: undefined, cleanRole: role }
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

function getStoredMission(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('cc-mission-statement') ?? ''
}

// ── Mission Statement ──

function MissionStatement() {
  const [editing, setEditing] = useState(false)
  const [mission, setMission] = useState(getStoredMission)
  const [savedMission, setSavedMission] = useState(getStoredMission)

  const handleSave = () => {
    localStorage.setItem('cc-mission-statement', mission)
    setSavedMission(mission)
    setEditing(false)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Mission Statement
        </h3>
        {editing ? (
          <Button size="sm" variant="ghost" onClick={handleSave} className="text-green-400 hover:text-green-300 h-6 px-2">
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-zinc-500 hover:text-zinc-300 h-6 px-2">
            <Edit3 className="w-3 h-3 mr-1" /> Edit
          </Button>
        )}
      </div>
      {editing ? (
        <Textarea
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          placeholder="Define your organization's mission..."
          className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm min-h-[80px] resize-none"
        />
      ) : savedMission ? (
        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{savedMission}</p>
      ) : (
        <p className="text-sm text-zinc-600 italic">No mission statement defined. Click Edit to add one.</p>
      )}
    </div>
  )
}

// ── Agent Card ──

function AgentCard({
  agent,
  selected,
  onSelect,
}: {
  agent: TeamAgent
  selected: boolean
  onSelect: () => void
}) {
  const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.offline

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left bg-zinc-900 border rounded-lg p-3 transition-colors flex items-center gap-3',
        selected ? 'border-indigo-600 bg-zinc-800/50' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30'
      )}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-lg">
        {agent.emoji ?? agent.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-medium text-zinc-200 truncate">{agent.name}</h4>
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusCfg.dotColor)} />
          <SourceBadge source={agent.source === 'scanner' ? 'openclaw' : agent.source} />
        </div>
        <p className="text-xs text-zinc-500 truncate">{agent.role}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {agent.model && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-zinc-500">
            <Cpu className="w-2.5 h-2.5 mr-0.5" />
            {agent.model.split('/').pop()}
          </Badge>
        )}
      </div>
    </button>
  )
}

// ── Agent Detail ──

function AgentDetail({ agent, onClose }: { agent: TeamAgent; onClose: () => void }) {
  const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.offline

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-4">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-2xl">
          {agent.emoji ?? agent.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-semibold text-zinc-100">{agent.name}</h3>
            <div className={cn('w-2 h-2 rounded-full', statusCfg.dotColor)} />
            <SourceBadge source={agent.source === 'scanner' ? 'openclaw' : agent.source} />
          </div>
          <p className="text-sm text-zinc-400">{agent.role}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-500 hover:text-zinc-300 h-7 px-2">
          Close
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Status</p>
          <p className="text-zinc-300">{statusCfg.label}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Source</p>
          <p className="text-zinc-300">{agent.source === 'scanner' ? 'OpenClaw (auto-discovered)' : agent.source}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Model</p>
          <p className="text-zinc-300">{agent.model || 'Not set'}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Provider</p>
          <p className="text-zinc-300">{agent.provider || 'Not set'}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Adapter</p>
          <p className="text-zinc-300">{agent.adapterType}</p>
        </div>
        {agent.lastHeartbeat && (
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Heartbeat</p>
            <p className="text-zinc-300 flex items-center gap-1">
              <Heart className="w-3 h-3" /> {relativeTime(agent.lastHeartbeat)}
            </p>
          </div>
        )}
        {agent.workspace && (
          <div className="col-span-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Workspace</p>
            <p className="text-zinc-400 text-xs font-mono truncate">{agent.workspace}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Org Tree (Paperclip) ──

function OrgNodeCard({
  node,
  depth = 0,
  onSelect,
}: {
  node: PaperclipOrgNode
  depth?: number
  onSelect: (agentId: string) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className={cn('pl-0', depth > 0 && 'ml-6 border-l border-zinc-800 pl-4')}>
      <button
        onClick={() => hasChildren ? setExpanded(!expanded) : onSelect(node.agentId)}
        className="w-full text-left flex items-center gap-3 py-2 px-2 rounded hover:bg-zinc-800/30 transition-colors"
      >
        <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-400">
          {node.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200 truncate">{node.name}</p>
          <p className="text-[10px] text-zinc-500 truncate">{node.role}</p>
        </div>
        <SourceBadge source="paperclip" />
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <OrgNodeCard key={child.agentId} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──

export default function TeamPage() {
  const { companyId, status: paperclipStatus } = usePaperclip()
  const { data: orgNodes } = useOrgChart(companyId)
  const { data: paperclipAgents } = useAgents(companyId)
  const { data: localAgentsRaw } = useLocalData<Record<string, unknown>>('agents')

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  // Normalize local agents
  const localAgents: TeamAgent[] = useMemo(() => {
    if (!localAgentsRaw) return []
    return localAgentsRaw.map((a) => {
      const rawRole = String(a.role ?? '')
      const { emoji, cleanRole } = extractEmoji(rawRole)
      return {
        id: String(a.id),
        name: String(a.name ?? 'Unknown'),
        emoji,
        role: cleanRole || 'Agent',
        model: String(a.model ?? ''),
        provider: String(a.provider ?? ''),
        status: String(a.status ?? 'idle'),
        adapterType: String(a.adapter_type ?? 'openclaw'),
        workspace: a.config_path ? String(a.config_path) : undefined,
        lastHeartbeat: a.last_heartbeat_at ? String(a.last_heartbeat_at) : undefined,
        source: (String(a.source ?? 'local') as 'local' | 'scanner'),
      }
    })
  }, [localAgentsRaw])

  // Normalize Paperclip agents
  const pcAgents: TeamAgent[] = useMemo(() => {
    if (!paperclipAgents) return []
    return paperclipAgents.map((a) => ({
      id: `pc-${a.id}`,
      name: a.name,
      role: a.role,
      model: a.modelName ?? '',
      provider: a.modelProvider ?? '',
      status: a.status ?? 'offline',
      adapterType: a.adapterType ?? 'paperclip',
      lastHeartbeat: a.lastHeartbeatAt,
      source: 'paperclip' as const,
    }))
  }, [paperclipAgents])

  // Group agents
  const openclawAgents = localAgents.filter((a) => a.source === 'scanner')
  const manualAgents = localAgents.filter((a) => a.source === 'local')
  const hasOrgData = orgNodes && orgNodes.length > 0
  const totalAgents = localAgents.length + pcAgents.length

  // Find selected agent across all sources
  const allAgents = [...localAgents, ...pcAgents]
  const selectedAgent = selectedAgentId ? allAgents.find((a) => a.id === selectedAgentId) : undefined

  // Get default model from OpenClaw agents
  const defaultModel = openclawAgents.length > 0 ? openclawAgents[0].model : null

  return (
    <div>
      <PageHeader
        title="Team"
        description="Your agent organization, hierarchy, and capabilities."
      />

      <MissionStatement />

      {/* Model info */}
      {defaultModel && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-zinc-500" />
          <span className="text-xs text-zinc-400">Default model:</span>
          <span className="text-xs text-zinc-200 font-mono">{defaultModel}</span>
        </div>
      )}

      {/* Selected agent detail */}
      {selectedAgent && (
        <AgentDetail agent={selectedAgent} onClose={() => setSelectedAgentId(null)} />
      )}

      {/* OpenClaw Agents (primary) */}
      {openclawAgents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-3.5 h-3.5 text-emerald-500" />
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              OpenClaw Agents
            </h3>
            <span className="text-[10px] text-zinc-600">({openclawAgents.length})</span>
          </div>
          <div className="space-y-2">
            {openclawAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={selectedAgentId === agent.id}
                onSelect={() => setSelectedAgentId(agent.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Manual Agents */}
      {manualAgents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-3.5 h-3.5 text-zinc-500" />
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Registered Agents
            </h3>
            <span className="text-[10px] text-zinc-600">({manualAgents.length})</span>
          </div>
          <div className="space-y-2">
            {manualAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={selectedAgentId === agent.id}
                onSelect={() => setSelectedAgentId(agent.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paperclip Org (overlay) */}
      {paperclipStatus === 'connected' && hasOrgData && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-3.5 h-3.5 text-violet-500" />
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Paperclip Org Chart
            </h3>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            {orgNodes.map((node) => (
              <OrgNodeCard key={node.agentId} node={node} onSelect={setSelectedAgentId} />
            ))}
          </div>
        </div>
      )}

      {/* Paperclip flat agent list (if no org but agents exist) */}
      {paperclipStatus === 'connected' && !hasOrgData && pcAgents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-3.5 h-3.5 text-violet-500" />
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Paperclip Agents
            </h3>
            <span className="text-[10px] text-zinc-600">({pcAgents.length})</span>
          </div>
          <div className="space-y-2">
            {pcAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={selectedAgentId === agent.id}
                onSelect={() => setSelectedAgentId(agent.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalAgents === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={Network}
            title="No agents discovered"
            description="Agents are auto-discovered from openclaw.json in your OpenClaw workspace. You can also register agents manually from the Agents screen."
          />
        </div>
      )}
    </div>
  )
}
