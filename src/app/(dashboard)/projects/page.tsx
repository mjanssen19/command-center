'use client'

import { useState, useMemo } from 'react'
import {
  FolderKanban,
  ArrowLeft,
  CheckSquare,
  FileText,
  Clock,
  Plus,
  Loader2,
  Users,
  Bot,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { SourceBadge } from '@/components/common/SourceBadge'
import { usePaperclip } from '@/lib/paperclip'
import { useProjects, useIssues } from '@/lib/paperclip/hooks'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { useLocalCreate } from '@/lib/hooks/useLocalMutations'
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
import type { PaperclipProject, PaperclipIssue } from '@/lib/paperclip/types'
import type { DataSource } from '@/lib/entities/types'

const PROJECT_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Active' },
  planning: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Planning' },
  paused: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Paused' },
  completed: { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: 'Completed' },
  archived: { color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20', label: 'Archived' },
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-zinc-500',
}

/** Extract emoji from beginning of a string if present */
function extractEmoji(str: string): string | null {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u
  const match = str.match(emojiRegex)
  return match ? match[0] : null
}

// ── Normalized display type ──

interface NormalizedProject {
  id: string
  name: string
  description?: string
  status: string
  ownerId?: string
  createdAt: string
  source: DataSource
  readonly: boolean
}

function normalizeProject(
  data: Record<string, unknown>,
  source: DataSource,
  readonly: boolean
): NormalizedProject {
  if (source === 'paperclip') {
    const p = data as unknown as PaperclipProject
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      createdAt: p.createdAt,
      source,
      readonly,
    }
  }
  // Local SQLite — snake_case
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
    description: data.description ? String(data.description) : undefined,
    status: String(data.status ?? 'active'),
    ownerId: data.owner_id ? String(data.owner_id) : undefined,
    createdAt: String(data.created_at ?? new Date().toISOString()),
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

function ProjectCard({
  project,
  taskCount,
  doneCount,
  ownerName,
  onClick,
}: {
  project: NormalizedProject
  taskCount: number
  doneCount: number
  ownerName?: string
  onClick: () => void
}) {
  const statusCfg = PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.active
  const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 hover:bg-zinc-800/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-zinc-200 truncate pr-2">{project.name}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <SourceBadge source={project.source} />
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0 h-4 border', statusCfg.color)}
          >
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      {project.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{project.description}</p>
      )}

      {/* Progress bar */}
      {taskCount > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-600">Progress</span>
            <span className="text-[10px] text-zinc-500">{progress}%</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1">
          <CheckSquare className="w-3 h-3" />
          {taskCount} tasks
        </span>
        {ownerName && (
          <span className="flex items-center gap-1">
            <Bot className="w-3 h-3" />
            {ownerName}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {relativeTime(project.createdAt)}
        </span>
      </div>
    </button>
  )
}

function ProjectDetail({
  project,
  paperclipIssues,
  localIssues,
  localAgents,
  agentMap,
  onBack,
}: {
  project: NormalizedProject
  paperclipIssues: PaperclipIssue[]
  localIssues: Record<string, unknown>[]
  localAgents: Record<string, unknown>[]
  agentMap: Record<string, { name: string; emoji?: string | null }>
  onBack: () => void
}) {
  const statusCfg = PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.active

  // Gather all issues for this project (local + Paperclip)
  const projectIssues = useMemo(() => {
    const issues: Array<{
      id: string
      title: string
      description?: string
      status: string
      priority?: string
      assigneeId?: string
      updatedAt: string
      source: DataSource
    }> = []

    // Local issues linked by project_id
    for (const i of localIssues) {
      if (String(i.project_id ?? '') === project.id) {
        issues.push({
          id: String(i.id ?? ''),
          title: String(i.title ?? ''),
          description: i.description ? String(i.description) : undefined,
          status: String(i.status ?? 'backlog'),
          priority: i.priority ? String(i.priority) : undefined,
          assigneeId: i.assignee_agent_id ? String(i.assignee_agent_id) : undefined,
          updatedAt: String(i.updated_at ?? new Date().toISOString()),
          source: 'local',
        })
      }
    }

    // Paperclip issues for Paperclip projects
    if (project.source === 'paperclip') {
      for (const i of paperclipIssues) {
        if (i.projectId === project.id) {
          issues.push({
            id: i.id,
            title: i.title,
            description: i.description,
            status: i.status,
            priority: i.priority,
            assigneeId: i.assigneeId,
            updatedAt: i.updatedAt,
            source: 'paperclip',
          })
        }
      }
    }

    return issues
  }, [project, paperclipIssues, localIssues])

  const doneCount = projectIssues.filter(
    (i) => {
      const s = i.status.toLowerCase()
      return s === 'done' || s === 'completed' || s === 'closed'
    }
  ).length
  const progress =
    projectIssues.length > 0 ? Math.round((doneCount / projectIssues.length) * 100) : 0

  // Unique agents working on this project
  const projectAgents = useMemo(() => {
    const agentIds = new Set<string>()
    for (const issue of projectIssues) {
      if (issue.assigneeId) agentIds.add(issue.assigneeId)
    }
    // Also include owner
    if (project.ownerId) agentIds.add(project.ownerId)

    return Array.from(agentIds).map((id) => {
      const info = agentMap[id]
      // Also try local agents directly for extra data
      const localAgent = localAgents.find((a) => String(a.id ?? '') === id)
      const role = localAgent ? String(localAgent.role ?? '') : ''
      const emoji = extractEmoji(role)
      const source = localAgent ? String(localAgent.source ?? 'local') : ''
      return {
        id,
        name: info?.name ?? id.slice(0, 8),
        emoji: info?.emoji ?? emoji,
        role,
        isScanner: source === 'scanner',
      }
    })
  }, [projectIssues, project.ownerId, agentMap, localAgents])

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="text-zinc-500 hover:text-zinc-300 mb-4 -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        Back to projects
      </Button>

      {/* Project header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-4">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-lg font-semibold text-zinc-100">{project.name}</h2>
          <div className="flex items-center gap-1.5">
            <SourceBadge source={project.source} />
            <Badge
              variant="outline"
              className={cn('text-xs px-2 py-0.5 border', statusCfg.color)}
            >
              {statusCfg.label}
            </Badge>
          </div>
        </div>
        {project.description && (
          <p className="text-sm text-zinc-400 mb-4">{project.description}</p>
        )}
        {projectIssues.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500">
                {doneCount} of {projectIssues.length} tasks completed
              </span>
              <span className="text-xs text-zinc-400">{progress}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">
            Tasks ({projectIssues.length})
          </TabsTrigger>
          <TabsTrigger value="agents" className="text-xs">
            Agents ({projectAgents.length})
          </TabsTrigger>
          <TabsTrigger value="docs" className="text-xs">
            Docs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Project Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                  Status
                </p>
                <p className="text-zinc-300">{project.status}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                  Created
                </p>
                <p className="text-zinc-300">{new Date(project.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                  Total Tasks
                </p>
                <p className="text-zinc-300">{projectIssues.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                  Completed
                </p>
                <p className="text-zinc-300">{doneCount}</p>
              </div>
              {project.ownerId && agentMap[project.ownerId] && (
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                    Owner
                  </p>
                  <p className="text-zinc-300">
                    {agentMap[project.ownerId].emoji ? `${agentMap[project.ownerId].emoji} ` : ''}
                    {agentMap[project.ownerId].name}
                  </p>
                </div>
              )}
            </div>

            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-6 mb-3">
              Milestones
            </h3>
            <p className="text-xs text-zinc-600">
              Milestones will be available in a future update.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          {projectIssues.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
              <EmptyState
                icon={CheckSquare}
                title="No tasks for this project"
                description="Tasks linked to this project will appear here."
              />
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800">
              {projectIssues.map((issue) => {
                const priorityColor = PRIORITY_COLORS[issue.priority ?? ''] ?? 'bg-zinc-600'
                const agentInfo = issue.assigneeId ? agentMap[issue.assigneeId] : undefined
                return (
                  <div
                    key={`${issue.source}-${issue.id}`}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', priorityColor)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{issue.title}</p>
                      {issue.description && (
                        <p className="text-[10px] text-zinc-600 truncate">{issue.description}</p>
                      )}
                    </div>
                    {agentInfo && (
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1 shrink-0">
                        {agentInfo.emoji ? (
                          <span className="text-xs">{agentInfo.emoji}</span>
                        ) : (
                          <Bot className="w-2.5 h-2.5" />
                        )}
                        {agentInfo.name}
                      </span>
                    )}
                    <SourceBadge source={issue.source} />
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {issue.status}
                    </Badge>
                    <span className="text-[10px] text-zinc-600 shrink-0">
                      {relativeTime(issue.updatedAt)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agents" className="mt-4">
          {projectAgents.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
              <EmptyState
                icon={Users}
                title="No agents on this project"
                description="Assign tasks to agents to see them listed here."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {projectAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      {agent.emoji ? (
                        <span className="text-lg">{agent.emoji}</span>
                      ) : (
                        <span className="text-sm font-bold text-zinc-400">
                          {agent.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-zinc-200 truncate">{agent.name}</h4>
                        {agent.isScanner && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 h-3.5 border bg-emerald-900/30 text-emerald-400 border-emerald-500/30"
                          >
                            OpenClaw
                          </Badge>
                        )}
                      </div>
                      {agent.role && (
                        <p className="text-xs text-zinc-500 truncate">{agent.role}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
            <EmptyState
              icon={FileText}
              title="Documents coming soon"
              description="Project-linked documents will be available in Phase 5 when the Docs integration is complete."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── New Project Dialog ──

function NewProjectDialog({
  open,
  onOpenChange,
  localAgents,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  localAgents: Record<string, unknown>[]
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [ownerId, setOwnerId] = useState('')
  const createProject = useLocalCreate<Record<string, unknown>>('projects')

  const handleSubmit = () => {
    if (!name.trim()) return
    const data: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || '',
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (ownerId) data.ownerId = ownerId

    createProject.mutate(data, {
      onSuccess: () => {
        setName('')
        setDescription('')
        setStatus('active')
        setOwnerId('')
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name..."
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
            <label className="text-xs text-zinc-400 mb-1 block">Status</label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Owner (Agent)</label>
            <Select value={ownerId} onValueChange={(v) => v !== null && setOwnerId(v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue placeholder="No owner" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="">None</SelectItem>
                {localAgents.map((agent) => {
                  const id = String(agent.id ?? '')
                  const agentName = String(agent.name ?? '')
                  const role = String(agent.role ?? '')
                  const emoji = extractEmoji(role)
                  return (
                    <SelectItem key={id} value={id}>
                      {emoji ? `${emoji} ` : ''}{agentName}
                    </SelectItem>
                  )
                })}
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
            disabled={!name.trim() || createProject.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {createProject.isPending ? (
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

export default function ProjectsPage() {
  const { companyId, status: paperclipStatus } = usePaperclip()
  const { data: paperclipProjects } = useProjects(companyId)
  const { data: paperclipIssues } = useIssues(companyId)
  const { data: localProjects } = useLocalData<Record<string, unknown>>('projects')
  const { data: localIssues } = useLocalData<Record<string, unknown>>('issues')
  const { data: localAgents } = useLocalData<Record<string, unknown>>('agents')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const paperclipConnected = paperclipStatus === 'connected'

  // Merge local + Paperclip projects
  const merged = useMergedList(localProjects, paperclipProjects, paperclipConnected)

  // Normalize
  const allProjects = useMemo(() => {
    return merged.items.map((item) =>
      normalizeProject(item.data as Record<string, unknown>, item.source, item.readonly)
    )
  }, [merged.items])

  const hasNoData = allProjects.length === 0

  // Build agent map from local agents first, then Paperclip
  const agentMap = useMemo(() => {
    const map: Record<string, { name: string; emoji?: string | null }> = {}
    if (localAgents) {
      for (const a of localAgents) {
        const id = String(a.id ?? '')
        const name = String(a.name ?? '')
        const role = String(a.role ?? '')
        const emoji = extractEmoji(role)
        map[id] = { name, emoji }
      }
    }
    return map
  }, [localAgents])

  // Task counts from both sources
  const taskCounts = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {}

    // Local issues (always primary)
    if (localIssues) {
      for (const issue of localIssues) {
        const projId = issue.project_id ? String(issue.project_id) : null
        if (projId) {
          if (!counts[projId]) counts[projId] = { total: 0, done: 0 }
          counts[projId].total++
          const s = String(issue.status ?? '').toLowerCase()
          if (s === 'done' || s === 'completed' || s === 'closed') {
            counts[projId].done++
          }
        }
      }
    }

    // Paperclip issues (overlay)
    if (paperclipIssues) {
      for (const issue of paperclipIssues) {
        if (issue.projectId) {
          if (!counts[issue.projectId]) counts[issue.projectId] = { total: 0, done: 0 }
          counts[issue.projectId].total++
          const s = issue.status.toLowerCase()
          if (s === 'done' || s === 'completed' || s === 'closed') {
            counts[issue.projectId].done++
          }
        }
      }
    }

    return counts
  }, [paperclipIssues, localIssues])

  const selectedProject = useMemo(() => {
    if (!selectedProjectId || !selectedSource) return null
    return allProjects.find((p) => p.id === selectedProjectId && p.source === selectedSource) ?? null
  }, [allProjects, selectedProjectId, selectedSource])

  if (selectedProject) {
    return (
      <div>
        <ProjectDetail
          project={selectedProject}
          paperclipIssues={paperclipIssues ?? []}
          localIssues={localIssues ?? []}
          localAgents={localAgents ?? []}
          agentMap={agentMap}
          onBack={() => {
            setSelectedProjectId(null)
            setSelectedSource(null)
          }}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage active projects, track progress, and review blockers, milestones, and linked work."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Project
          </Button>
        }
      />


      {hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to get started. Projects from Paperclip will also appear here when connected."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Project
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {allProjects.map((project) => {
            const counts = taskCounts[project.id] ?? { total: 0, done: 0 }
            const ownerName = project.ownerId ? agentMap[project.ownerId]?.name : undefined
            return (
              <ProjectCard
                key={`${project.source}-${project.id}`}
                project={project}
                taskCount={counts.total}
                doneCount={counts.done}
                ownerName={ownerName}
                onClick={() => {
                  setSelectedProjectId(project.id)
                  setSelectedSource(project.source)
                }}
              />
            )
          })}
        </div>
      )}

      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        localAgents={localAgents ?? []}
      />
    </div>
  )
}
