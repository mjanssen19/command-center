'use client'

import { useState, useMemo, useCallback, useSyncExternalStore } from 'react'
import {
  CheckSquare,
  Plus,
  Filter,
  Activity,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  X,
  ArrowRight,
  Clock,
  MessageSquare,
  User,
  Play,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MetricCard } from '@/components/cards/MetricCard'
import { EmptyState } from '@/components/common/EmptyState'
import { PaperclipOfflineBanner } from '@/components/common/PaperclipOfflineBanner'
import { SourceBadge } from '@/components/common/SourceBadge'
import { usePaperclip } from '@/lib/paperclip'
import {
  useIssues,
  useActivity,
  useUpdateIssue,
  useAgents,
  useAgentRuns,
  useIssueComments,
} from '@/lib/paperclip/hooks'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { useLocalCreate } from '@/lib/hooks/useLocalMutations'
import { useLocalUpdate } from '@/lib/hooks/useLocalMutations'
import { useMergedList } from '@/lib/hooks/useMergedData'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PaperclipIssue, PaperclipRun } from '@/lib/paperclip/types'
import type { DataSource } from '@/lib/entities/types'

// ── Constants ──

const KANBAN_COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: 'bg-zinc-500', stateLabel: 'Backlog' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500', stateLabel: 'In Progress' },
  { key: 'review', label: 'Review', color: 'bg-amber-500', stateLabel: 'Review' },
  { key: 'done', label: 'Done', color: 'bg-green-500', stateLabel: 'Done' },
] as const

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-zinc-500',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  backlog: 'bg-zinc-700 text-zinc-300',
  in_progress: 'bg-blue-900/50 text-blue-300',
  review: 'bg-amber-900/50 text-amber-300',
  done: 'bg-green-900/50 text-green-300',
}

// ── Normalized display type ──

interface NormalizedTask {
  id: string
  title: string
  description?: string
  status: string
  priority?: string
  projectId?: string
  assigneeId?: string
  dueDate?: string
  labels?: string[]
  createdAt: string
  updatedAt: string
  source: DataSource
  readonly: boolean
}

// ── Helpers ──

function mapStatusToColumn(status: string): string {
  const s = status.toLowerCase().replace(/\s+/g, '_')
  if (['done', 'completed', 'closed'].includes(s)) return 'done'
  if (['review', 'in_review', 'testing'].includes(s)) return 'review'
  if (['in_progress', 'active', 'started', 'running'].includes(s)) return 'in_progress'
  return 'backlog'
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

function columnLabel(key: string): string {
  return KANBAN_COLUMNS.find((c) => c.key === key)?.label ?? key
}

/** Extract emoji from beginning of a string if present */
function extractEmoji(str: string): string | null {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u
  const match = str.match(emojiRegex)
  return match ? match[0] : null
}

/** Normalize a merged item into a common display shape */
function normalizeTask(
  data: Record<string, unknown>,
  source: DataSource,
  readonly: boolean
): NormalizedTask {
  if (source === 'paperclip') {
    const p = data as unknown as PaperclipIssue
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      priority: p.priority,
      projectId: p.projectId,
      assigneeId: p.assigneeId,
      labels: p.labels,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      source,
      readonly,
    }
  }
  // Local SQLite — snake_case fields
  return {
    id: String(data.id ?? ''),
    title: String(data.title ?? ''),
    description: data.description ? String(data.description) : undefined,
    status: String(data.status ?? 'backlog'),
    priority: data.priority ? String(data.priority) : undefined,
    projectId: data.project_id ? String(data.project_id) : undefined,
    assigneeId: data.assignee_agent_id ? String(data.assignee_agent_id) : undefined,
    dueDate: data.due_date ? String(data.due_date) : undefined,
    labels: Array.isArray(data.labels) ? (data.labels as string[]) : [],
    createdAt: String(data.created_at ?? new Date().toISOString()),
    updatedAt: String(data.updated_at ?? new Date().toISOString()),
    source,
    readonly,
  }
}

/** Log a local activity event to SQLite */
async function logLocalActivity(data: {
  type: string
  entityType: string
  entityId: string
  summary: string
  source?: string
}) {
  try {
    await fetch('/api/local/activity_events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        source: data.source ?? 'command-center',
      }),
    })
  } catch {
    // Silently fail — local logging should not block UI
  }
}

// ── Unified activity event type ──

interface UnifiedActivityEvent {
  id: string
  type: string
  summary: string
  timestamp: string
  source: DataSource
  issueId?: string
}

// ── State Flow Visualization ──

function StateFlowIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 mb-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[11px] text-zinc-500 overflow-x-auto">
      <span className="font-medium text-zinc-400">Task lifecycle:</span>
      <span className="flex items-center gap-1 ml-2">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          Backlog
        </span>
        <ArrowRight className="w-3 h-3 text-zinc-700" />
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          In Progress
        </span>
        <ArrowRight className="w-3 h-3 text-zinc-700" />
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Review
        </span>
        <ArrowRight className="w-3 h-3 text-zinc-700" />
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Done
        </span>
      </span>
    </div>
  )
}

// ── Enhanced Task Card ──

function TaskCard({
  task,
  agents,
  activities,
  runs,
  onClick,
}: {
  task: NormalizedTask
  agents: Record<string, { name: string; emoji?: string | null }>
  activities: UnifiedActivityEvent[]
  runs: PaperclipRun[]
  onClick: () => void
}) {
  const priorityColor = PRIORITY_COLORS[task.priority ?? ''] ?? 'bg-zinc-600'
  const agentInfo = task.assigneeId ? agents[task.assigneeId] : undefined

  // Check if agent is currently running on this task
  const isAgentRunning = runs.some(
    (r) => r.status === 'running' && r.agentId === task.assigneeId
  )

  // Last agent action from activity feed (any source)
  const lastActivity = activities
    .filter((a) => a.issueId === task.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

  // Run count for this task
  const taskRuns = task.assigneeId
    ? runs.filter((r) => r.agentId === task.assigneeId).length
    : 0

  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors cursor-pointer group"
    >
      <div className="flex items-start gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 shrink-0 mt-1">
          <div className={cn('w-1.5 h-1.5 rounded-full', priorityColor)} />
          {isAgentRunning && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2 group-hover:text-zinc-100">
          {task.title}
        </p>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-700 shrink-0 mt-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {task.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-2 ml-3.5">{task.description}</p>
      )}

      {/* Agent action / run info */}
      {lastActivity && (
        <p className="text-[10px] text-zinc-600 ml-3.5 mb-1.5 truncate">
          {lastActivity.summary} &middot; {relativeTime(lastActivity.timestamp)}
        </p>
      )}

      <div className="flex items-center gap-2 ml-3.5 flex-wrap">
        <SourceBadge source={task.source} />
        {task.projectId && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {task.projectId.slice(0, 8)}
          </Badge>
        )}
        {agentInfo && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">
                {agentInfo.emoji ?? agentInfo.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">{agentInfo.name}</span>
          </div>
        )}
        {task.dueDate && (
          <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {taskRuns > 0 && (
          <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
            <Play className="w-2.5 h-2.5" />
            {taskRuns} run{taskRuns !== 1 ? 's' : ''}
          </span>
        )}
        <span className="text-[10px] text-zinc-600 ml-auto">{relativeTime(task.updatedAt)}</span>
      </div>
    </div>
  )
}

// ── Kanban Column ──

function KanbanColumn({
  label,
  color,
  tasks,
  agents,
  activities,
  runs,
  onTaskClick,
  companyId,
  isReviewColumn,
}: {
  label: string
  color: string
  tasks: NormalizedTask[]
  agents: Record<string, { name: string; emoji?: string | null }>
  activities: UnifiedActivityEvent[]
  runs: PaperclipRun[]
  onTaskClick: (task: NormalizedTask) => void
  companyId: string | undefined
  isReviewColumn: boolean
}) {
  const updatePaperclipIssue = useUpdateIssue(companyId)
  const updateLocalIssue = useLocalUpdate('issues')

  const handleReviewAction = (task: NormalizedTask, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (task.source === 'local') {
      updateLocalIssue.mutate(
        { id: task.id, status: newStatus, updated_at: new Date().toISOString() },
        {
          onSuccess: () => {
            logLocalActivity({
              type: newStatus === 'done' ? 'task_approved' : 'task_status_changed',
              entityType: 'issue',
              entityId: task.id,
              summary:
                newStatus === 'done'
                  ? `User approved task '${task.title}'`
                  : `User requested changes on task '${task.title}'`,
            })
          },
        }
      )
    } else {
      updatePaperclipIssue.mutate(
        { issueId: task.id, status: newStatus },
        {
          onSuccess: () => {
            logLocalActivity({
              type: newStatus === 'done' ? 'task_approved' : 'task_status_changed',
              entityType: 'issue',
              entityId: task.id,
              summary:
                newStatus === 'done'
                  ? `User approved task '${task.title}'`
                  : `User requested changes on task '${task.title}'`,
            })
          },
        }
      )
    }
  }

  const isUpdating = updatePaperclipIssue.isPending || updateLocalIssue.isPending

  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('w-2 h-2 rounded-full', color)} />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded-full px-1.5 py-0.5 font-medium">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-[200px]">
        {tasks.length === 0 ? (
          <div className="flex-1 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center">
            <p className="text-xs text-zinc-600">No tasks</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={`${task.source}-${task.id}`}>
              <TaskCard
                task={task}
                agents={agents}
                activities={activities}
                runs={runs}
                onClick={() => onTaskClick(task)}
              />
              {/* Review gate inline buttons */}
              {isReviewColumn && (
                <div className="flex gap-1.5 mt-1 px-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-6 text-[10px] text-green-400 hover:text-green-300 hover:bg-green-900/20"
                    onClick={(e) => handleReviewAction(task, 'done', e)}
                    disabled={isUpdating}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-0.5" />
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-6 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-900/20"
                    onClick={(e) => handleReviewAction(task, 'in_progress', e)}
                    disabled={isUpdating}
                  >
                    <RotateCcw className="w-3 h-3 mr-0.5" />
                    Request Changes
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Activity Sidebar ── (now uses local + Paperclip events)

function ActivitySidebar({ activities }: { activities: UnifiedActivityEvent[] }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <Activity className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Activity
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-zinc-600">No recent activity</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {activities.slice(0, 30).map((event) => (
              <div
                key={`${event.source}-${event.id}`}
                className="px-2 py-1.5 rounded-md hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <p className="text-xs text-zinc-300 leading-snug flex-1">{event.summary}</p>
                  <SourceBadge source={event.source} />
                </div>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {relativeTime(event.timestamp)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Task Detail Panel ──

function TaskDetailPanel({
  task,
  agents,
  activities,
  comments,
  companyId,
  onClose,
}: {
  task: NormalizedTask
  agents: Record<string, { name: string; emoji?: string | null }>
  activities: UnifiedActivityEvent[]
  comments: unknown[] | undefined
  companyId: string | undefined
  onClose: () => void
}) {
  const updatePaperclipIssue = useUpdateIssue(companyId)
  const updateLocalIssue = useLocalUpdate('issues')
  const col = mapStatusToColumn(task.status)
  const agentInfo = task.assigneeId ? agents[task.assigneeId] : undefined

  // Filter activities for this issue (both local and Paperclip)
  const issueActivities = activities
    .filter((a) => a.issueId === task.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Merge comments into timeline
  const commentEvents: Array<{ id: string; type: string; summary: string; timestamp: string; source: DataSource }> =
    Array.isArray(comments)
      ? comments.map((raw: unknown, idx: number) => {
          const c = raw as Record<string, unknown>
          return {
            id: `comment-${idx}`,
            type: 'comment',
            summary: String(c.body || c.content || 'Comment'),
            timestamp: String(c.createdAt || c.timestamp || ''),
            source: 'paperclip' as DataSource,
          }
        })
      : []

  const timeline = [
    ...issueActivities.map((a) => ({
      id: a.id,
      type: a.type,
      summary: a.summary,
      timestamp: a.timestamp,
      source: a.source,
    })),
    ...commentEvents.filter((c) => c.timestamp),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const handleStatusChange = (newStatus: string) => {
    const oldCol = col
    if (task.source === 'local') {
      updateLocalIssue.mutate(
        { id: task.id, status: newStatus, updated_at: new Date().toISOString() },
        {
          onSuccess: () => {
            logLocalActivity({
              type: 'task_status_changed',
              entityType: 'issue',
              entityId: task.id,
              summary: `User moved task '${task.title}' from ${columnLabel(oldCol)} to ${columnLabel(mapStatusToColumn(newStatus))}`,
            })
          },
        }
      )
    } else {
      if (!companyId) return
      updatePaperclipIssue.mutate(
        { issueId: task.id, status: newStatus },
        {
          onSuccess: () => {
            logLocalActivity({
              type: 'task_status_changed',
              entityType: 'issue',
              entityId: task.id,
              summary: `User moved task '${task.title}' from ${columnLabel(oldCol)} to ${columnLabel(mapStatusToColumn(newStatus))}`,
            })
          },
        }
      )
    }
  }

  const isUpdating = updatePaperclipIssue.isPending || updateLocalIssue.isPending

  const eventIcon = (type: string) => {
    if (type === 'comment') return <MessageSquare className="w-3 h-3 text-zinc-500" />
    if (type.includes('assign')) return <User className="w-3 h-3 text-indigo-400" />
    if (type.includes('complete') || type.includes('done'))
      return <CheckCircle2 className="w-3 h-3 text-green-400" />
    if (type.includes('start') || type.includes('running'))
      return <Play className="w-3 h-3 text-blue-400" />
    if (type.includes('error') || type.includes('fail'))
      return <AlertCircle className="w-3 h-3 text-red-400" />
    return <Clock className="w-3 h-3 text-zinc-500" />
  }

  return (
    <div className="w-96 shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-zinc-800">
        <div className="flex-1 min-w-0 mr-2">
          <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{task.title}</h3>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <SourceBadge source={task.source} />
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded',
                STATUS_BADGE_COLORS[col] ?? 'bg-zinc-700 text-zinc-300'
              )}
            >
              {columnLabel(col)}
            </span>
            {task.priority && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_COLORS[task.priority])} />
                {task.priority}
              </span>
            )}
            {agentInfo && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                {agentInfo.emoji ? (
                  <span className="text-xs">{agentInfo.emoji}</span>
                ) : (
                  <User className="w-2.5 h-2.5" />
                )}
                {agentInfo.name}
              </span>
            )}
            {task.dueDate && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                <Calendar className="w-2.5 h-2.5" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded transition-colors">
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Description */}
      {task.description && (
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
            Description
          </p>
          <p className="text-xs text-zinc-400 leading-relaxed">{task.description}</p>
        </div>
      )}

      {/* Status controls */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Move to
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {KANBAN_COLUMNS.map((c) => (
            <Button
              key={c.key}
              variant="ghost"
              size="sm"
              disabled={col === c.key || isUpdating}
              className={cn(
                'h-6 text-[10px] px-2',
                col === c.key
                  ? 'bg-zinc-800 text-zinc-500 cursor-default'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
              onClick={() => handleStatusChange(c.key)}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full mr-1', c.color)} />
              {c.label}
            </Button>
          ))}
        </div>
        {/* Review-specific actions */}
        {col === 'review' && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="flex-1 h-7 text-xs bg-green-700 hover:bg-green-600 text-white"
              onClick={() => handleStatusChange('done')}
              disabled={isUpdating}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-900/20"
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdating}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Request Changes
            </Button>
          </div>
        )}
      </div>

      {/* Activity timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Activity ({timeline.length})
          </p>
          {timeline.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-4">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {timeline.map((event) => (
                <div key={`${event.source}-${event.id}`} className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">{eventIcon(event.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-300 leading-snug">{event.summary}</p>
                    {event.timestamp && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        {relativeTime(event.timestamp)}
                      </p>
                    )}
                  </div>
                  <SourceBadge source={event.source} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── New Task Dialog ──

function NewTaskDialog({
  open,
  onOpenChange,
  localAgents,
  localProjects,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  localAgents: Record<string, unknown>[]
  localProjects: Record<string, unknown>[]
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('backlog')
  const [priority, setPriority] = useState('medium')
  const [assigneeAgentId, setAssigneeAgentId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const createLocalIssue = useLocalCreate<Record<string, unknown>>('issues')

  const handleSubmit = () => {
    if (!title.trim()) return
    const data: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || '',
      status,
      priority,
      labels: '[]',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (assigneeAgentId) data.assigneeAgentId = assigneeAgentId
    if (projectId) data.projectId = projectId
    if (dueDate) data.dueDate = dueDate

    createLocalIssue.mutate(data, {
      onSuccess: () => {
        logLocalActivity({
          type: 'task_created',
          entityType: 'issue',
          entityId: '',
          summary: `User created task '${title.trim()}'`,
        })
        setTitle('')
        setDescription('')
        setStatus('backlog')
        setPriority('medium')
        setAssigneeAgentId('')
        setProjectId('')
        setDueDate('')
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Status</label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Priority</label>
              <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Assign to Agent</label>
            <Select value={assigneeAgentId} onValueChange={(v) => v !== null && setAssigneeAgentId(v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue placeholder="No agent assigned" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="">None</SelectItem>
                {localAgents.map((agent) => {
                  const id = String(agent.id ?? '')
                  const name = String(agent.name ?? '')
                  const role = String(agent.role ?? '')
                  const emoji = extractEmoji(role)
                  return (
                    <SelectItem key={id} value={id}>
                      {emoji ? `${emoji} ` : ''}{name}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Project</label>
            <Select value={projectId} onValueChange={(v) => v !== null && setProjectId(v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="">None</SelectItem>
                {localProjects.map((project) => {
                  const id = String(project.id ?? '')
                  const name = String(project.name ?? '')
                  return (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createLocalIssue.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {createLocalIssue.isPending ? (
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

// ── Task Detail Wrapper (fetches comments for selected issue) ──

function TaskDetailPanelWrapper({
  task,
  agents,
  activities,
  companyId,
  onClose,
}: {
  task: NormalizedTask
  agents: Record<string, { name: string; emoji?: string | null }>
  activities: UnifiedActivityEvent[]
  companyId: string | undefined
  onClose: () => void
}) {
  // Only fetch comments for Paperclip issues
  const { data: comments } = useIssueComments(
    task.source === 'paperclip' ? companyId : undefined,
    task.source === 'paperclip' ? task.id : undefined
  )

  return (
    <TaskDetailPanel
      task={task}
      agents={agents}
      activities={activities}
      comments={comments as unknown[] | undefined}
      companyId={companyId}
      onClose={onClose}
    />
  )
}

// ── Main Page ──

export default function TasksPage() {
  const { companyId, status: paperclipStatus } = usePaperclip()
  const { data: paperclipIssues, dataUpdatedAt } = useIssues(companyId)
  const { data: localIssues } = useLocalData<Record<string, unknown>>('issues')
  const { data: paperclipActivities } = useActivity(companyId)
  const { data: localActivityEvents } = useLocalData<Record<string, unknown>>('activity_events')
  const { data: paperclipAgents } = useAgents(companyId)
  const { data: localAgents } = useLocalData<Record<string, unknown>>('agents')
  const { data: localProjects } = useLocalData<Record<string, unknown>>('projects')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(true)
  const [selectedTask, setSelectedTask] = useState<NormalizedTask | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const paperclipConnected = paperclipStatus === 'connected'

  // Merge local + Paperclip issues
  const merged = useMergedList(localIssues, paperclipIssues, paperclipConnected)

  // Normalize all merged items into the common display shape
  const allTasks = useMemo(() => {
    return merged.items.map((item) =>
      normalizeTask(item.data as Record<string, unknown>, item.source, item.readonly)
    )
  }, [merged.items])

  // Fetch runs for the selected task's agent
  const { data: allRuns } = useAgentRuns(companyId, selectedTask?.assigneeId ?? undefined)

  // Build unified agent map from local agents first, then Paperclip agents
  const agentMap = useMemo(() => {
    const map: Record<string, { name: string; emoji?: string | null }> = {}
    // Local agents first (primary)
    if (localAgents) {
      for (const a of localAgents) {
        const id = String(a.id ?? '')
        const name = String(a.name ?? '')
        const role = String(a.role ?? '')
        const emoji = extractEmoji(role)
        map[id] = { name, emoji }
      }
    }
    // Paperclip agents as fallback
    if (paperclipAgents) {
      for (const a of paperclipAgents) {
        if (!map[a.id]) {
          map[a.id] = { name: a.name, emoji: null }
        }
      }
    }
    return map
  }, [localAgents, paperclipAgents])

  // Unified activity events: local activity_events + Paperclip activity
  const unifiedActivities = useMemo(() => {
    const events: UnifiedActivityEvent[] = []
    // Local activity events (always present)
    if (localActivityEvents) {
      for (const e of localActivityEvents) {
        events.push({
          id: String(e.id ?? ''),
          type: String(e.type ?? ''),
          summary: String(e.summary ?? ''),
          timestamp: String(e.timestamp ?? ''),
          source: 'local',
          issueId: e.entity_type === 'issue' ? String(e.entity_id ?? '') : undefined,
        })
      }
    }
    // Paperclip activity (when connected)
    if (paperclipActivities) {
      for (const a of paperclipActivities) {
        events.push({
          id: a.id,
          type: a.type,
          summary: a.summary,
          timestamp: a.timestamp,
          source: 'paperclip',
          issueId: a.issueId,
        })
      }
    }
    // Sort by newest first
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return events
  }, [localActivityEvents, paperclipActivities])

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (filterStatus !== 'all' && mapStatusToColumn(task.status) !== filterStatus) return false
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false
      return true
    })
  }, [allTasks, filterStatus, filterPriority])

  const columnTasks = useMemo(() => {
    const map: Record<string, NormalizedTask[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    }
    for (const task of filteredTasks) {
      const col = mapStatusToColumn(task.status)
      if (map[col]) map[col].push(task)
    }
    return map
  }, [filteredTasks])

  const handleTaskClick = useCallback((task: NormalizedTask) => {
    setSelectedTask(task)
  }, [])

  // Metrics from merged data
  const totalTasks = allTasks.length
  const inProgress = allTasks.filter((t) => mapStatusToColumn(t.status) === 'in_progress').length
  const doneTasks = allTasks.filter((t) => mapStatusToColumn(t.status) === 'done').length
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // Week tasks (created in last 7 days)
  const weekCutoff = useSyncExternalStore(
    () => () => {},
    () => Date.now() - 7 * 86_400_000,
    () => Date.now() - 7 * 86_400_000
  )
  const thisWeek = useMemo(() => {
    return allTasks.filter((t) => new Date(t.createdAt).getTime() > weekCutoff).length
  }, [allTasks, weekCutoff])

  // Last updated timestamp
  const lastUpdatedStr = useMemo(() => {
    if (!dataUpdatedAt) return null
    return relativeTime(new Date(dataUpdatedAt).toISOString())
  }, [dataUpdatedAt])

  // Keep selectedTask in sync with latest data
  const currentSelectedTask = useMemo(() => {
    if (!selectedTask) return null
    const found = allTasks.find(
      (t) => t.id === selectedTask.id && t.source === selectedTask.source
    )
    return found ?? selectedTask
  }, [selectedTask, allTasks])

  const hasNoData = allTasks.length === 0

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Tasks"
        description="Assign, track, and review work across your autonomous agents."
        actions={
          <div className="flex items-center gap-3">
            {lastUpdatedStr && (
              <span className="text-[10px] text-zinc-600">
                Updated {lastUpdatedStr}
              </span>
            )}
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Task
            </Button>
          </div>
        }
      />

      <PaperclipOfflineBanner />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="This Week" value={thisWeek} period="Last 7 days" />
        <MetricCard label="In Progress" value={inProgress} />
        <MetricCard label="Total Tasks" value={totalTasks} />
        <MetricCard label="Completion Rate" value={`${completionRate}%`} />
      </div>

      {/* State flow indicator */}
      <StateFlowIndicator />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-3.5 h-3.5 text-zinc-500" />
        <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
          <SelectTrigger className="w-[140px] h-7 text-xs bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={(v) => v && setFilterPriority(v)}>
          <SelectTrigger className="w-[130px] h-7 text-xs bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1">
          {selectedTask && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTask(null)}
              className="text-zinc-500 hover:text-zinc-300 h-7 px-2 text-[10px]"
            >
              Close detail
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActivityOpen(!activityOpen)}
            className="text-zinc-500 hover:text-zinc-300 h-7 px-2"
          >
            {activityOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      {hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description="Create your first task to get started. Tasks assigned to agents will appear on the board as they are picked up."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Task
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Kanban board */}
          <div className="flex gap-4 flex-1 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.key}
                label={col.label}
                color={col.color}
                tasks={columnTasks[col.key] ?? []}
                agents={agentMap}
                activities={unifiedActivities}
                runs={allRuns ?? []}
                onTaskClick={handleTaskClick}
                companyId={companyId}
                isReviewColumn={col.key === 'review'}
              />
            ))}
          </div>

          {/* Task detail panel */}
          {currentSelectedTask && (
            <TaskDetailPanelWrapper
              task={currentSelectedTask}
              agents={agentMap}
              activities={unifiedActivities}
              companyId={companyId}
              onClose={() => setSelectedTask(null)}
            />
          )}

          {/* Activity sidebar */}
          {activityOpen && !currentSelectedTask && (
            <div className="w-72 shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <ActivitySidebar activities={unifiedActivities} />
            </div>
          )}
        </div>
      )}

      <NewTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        localAgents={localAgents ?? []}
        localProjects={localProjects ?? []}
      />
    </div>
  )
}
