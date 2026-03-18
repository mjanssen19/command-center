'use client'

import { useState, useMemo } from 'react'
import {
  Network,
  Bot,
  Heart,
  Cpu,
  Edit3,
  Save,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { PaperclipOfflineBanner } from '@/components/common/PaperclipOfflineBanner'
import { usePaperclip } from '@/lib/paperclip'
import { useOrgChart, useAgents } from '@/lib/paperclip/hooks'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { PaperclipOrgNode, PaperclipAgent } from '@/lib/paperclip/types'

const STATUS_CONFIG: Record<string, { dotColor: string; label: string }> = {
  active: { dotColor: 'bg-green-500', label: 'Active' },
  paused: { dotColor: 'bg-amber-500', label: 'Paused' },
  error: { dotColor: 'bg-red-500', label: 'Error' },
  offline: { dotColor: 'bg-zinc-500', label: 'Offline' },
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
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            className="text-green-400 hover:text-green-300 h-6 px-2"
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="text-zinc-500 hover:text-zinc-300 h-6 px-2"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            Edit
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
        <p className="text-sm text-zinc-600 italic">
          No mission statement defined. Click Edit to add one.
        </p>
      )}
    </div>
  )
}

function OrgNodeCard({
  node,
  agent,
  depth = 0,
  onSelect,
}: {
  node: PaperclipOrgNode
  agent?: PaperclipAgent
  depth?: number
  onSelect: (agentId: string) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0
  const status = agent?.status ?? 'offline'
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline

  return (
    <div className={cn('pl-0', depth > 0 && 'ml-6 border-l border-zinc-800 pl-4')}>
      <div className="flex items-start gap-3 py-2">
        {/* Expand toggle */}
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5',
            hasChildren
              ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              : 'text-transparent cursor-default'
          )}
        >
          {hasChildren &&
            (expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            ))}
        </button>

        {/* Node card */}
        <button
          onClick={() => onSelect(node.agentId)}
          className="flex-1 text-left bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-zinc-400">
                {node.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-medium text-zinc-200 truncate">{node.name}</h4>
                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusCfg.dotColor)} />
              </div>
              <p className="text-xs text-zinc-500 truncate">{node.role}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {agent?.modelProvider && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-zinc-500">
                  <Cpu className="w-2.5 h-2.5 mr-0.5" />
                  {agent.modelProvider}
                </Badge>
              )}
              {agent?.lastHeartbeatAt && (
                <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5" />
                  {relativeTime(agent.lastHeartbeatAt)}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <OrgNodeCard
              key={child.agentId}
              node={child}
              agent={undefined}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FlatAgentList({
  agents,
  onSelect,
}: {
  agents: PaperclipAgent[]
  onSelect: (agentId: string) => void
}) {
  return (
    <div className="space-y-2">
      {agents.map((agent) => {
        const status = agent.status ?? 'offline'
        const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline

        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 hover:bg-zinc-800/30 transition-colors flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-zinc-400">
                {agent.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-medium text-zinc-200 truncate">{agent.name}</h4>
                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusCfg.dotColor)} />
              </div>
              <p className="text-xs text-zinc-500 truncate">{agent.role}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {agent.modelProvider && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-zinc-500">
                  {agent.modelProvider}
                </Badge>
              )}
              {agent.lastHeartbeatAt && (
                <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5" />
                  {relativeTime(agent.lastHeartbeatAt)}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function AgentDetailPanel({
  agent,
  onClose,
}: {
  agent: PaperclipAgent
  onClose: () => void
}) {
  const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.offline

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-zinc-400">
            {agent.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-semibold text-zinc-100">{agent.name}</h3>
            <div className={cn('w-2 h-2 rounded-full', statusCfg.dotColor)} />
          </div>
          <p className="text-sm text-zinc-400">{agent.role}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 h-7 px-2"
        >
          Close
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Status</p>
          <p className="text-zinc-300">{statusCfg.label}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Heartbeat</p>
          <p className="text-zinc-300">{relativeTime(agent.lastHeartbeatAt)}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Model</p>
          <p className="text-zinc-300">
            {agent.modelProvider ?? 'Unknown'}/{agent.modelName ?? 'unknown'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Adapter</p>
          <p className="text-zinc-300">{agent.adapterType}</p>
        </div>
        {agent.monthlySpend !== undefined && (
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
              Monthly Cost
            </p>
            <p className="text-zinc-300">${agent.monthlySpend.toFixed(2)}</p>
          </div>
        )}
        {agent.currentTaskId && (
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
              Current Task
            </p>
            <p className="text-zinc-300 truncate">{agent.currentTaskId}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { companyId, status: paperclipStatus, company } = usePaperclip()
  const { data: orgNodes } = useOrgChart(companyId)
  const { data: agents } = useAgents(companyId)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  const isOffline = paperclipStatus === 'disconnected'
  const hasOrgData = orgNodes && orgNodes.length > 0
  const hasAgents = agents && agents.length > 0

  const agentMap = useMemo(() => {
    const map: Record<string, PaperclipAgent> = {}
    if (agents) {
      for (const a of agents) {
        map[a.id] = a
      }
    }
    return map
  }, [agents])

  const selectedAgent = selectedAgentId ? agentMap[selectedAgentId] : undefined

  return (
    <div>
      <PageHeader
        title="Team"
        description="View your agent org structure, hierarchy, responsibilities, capabilities, and runtime placement."
      />

      <PaperclipOfflineBanner />

      {/* Mission Statement */}
      <MissionStatement />

      {/* Agent detail panel */}
      {selectedAgent && (
        <div className="mb-4">
          <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedAgentId(null)} />
        </div>
      )}

      {/* Org visualization */}
      {isOffline && !hasAgents ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={Network}
            title="Paperclip is offline"
            description="The org structure is powered by Paperclip. Connect to Paperclip to view your agent hierarchy."
          />
        </div>
      ) : hasOrgData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Organization Structure
          </h3>
          {/* Company root node */}
          {company && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-zinc-200">{company.name}</span>
            </div>
          )}
          <div>
            {orgNodes.map((node) => (
              <OrgNodeCard
                key={node.agentId}
                node={node}
                agent={agentMap[node.agentId]}
                depth={0}
                onSelect={setSelectedAgentId}
              />
            ))}
          </div>
        </div>
      ) : hasAgents ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-3.5 h-3.5 text-zinc-500" />
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Agent List
            </h3>
            <span className="text-[10px] text-zinc-600">
              (No hierarchy data — showing flat list)
            </span>
          </div>
          <FlatAgentList agents={agents} onSelect={setSelectedAgentId} />
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={Network}
            title="No agent hierarchy discovered"
            description="The agent org structure will populate from Paperclip once connected. This shows top-level roles, sub-agents, capabilities, models, and machine placement."
          />
        </div>
      )}
    </div>
  )
}
