'use client'

import { useState, useMemo, useSyncExternalStore } from 'react'
import {
  CheckSquare,
  Plus,
  Filter,
  Activity,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MetricCard } from '@/components/cards/MetricCard'
import { EmptyState } from '@/components/common/EmptyState'
import { PaperclipOfflineBanner } from '@/components/common/PaperclipOfflineBanner'
import { usePaperclip } from '@/lib/paperclip'
import { useIssues, useActivity, useCreateIssue, useAgents } from '@/lib/paperclip/hooks'
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
import type { PaperclipIssue, PaperclipActivity } from '@/lib/paperclip/types'

const KANBAN_COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: 'bg-zinc-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { key: 'review', label: 'Review', color: 'bg-amber-500' },
  { key: 'done', label: 'Done', color: 'bg-green-500' },
] as const

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-zinc-500',
}

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

function TaskCard({ issue, agents }: { issue: PaperclipIssue; agents: Record<string, string> }) {
  const priorityColor = PRIORITY_COLORS[issue.priority ?? ''] ?? 'bg-zinc-600'
  const agentName = issue.assigneeId ? agents[issue.assigneeId] : undefined

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors cursor-default">
      <div className="flex items-start gap-2 mb-1.5">
        <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', priorityColor)} />
        <p className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2">
          {issue.title}
        </p>
      </div>
      {issue.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-2 ml-3.5">{issue.description}</p>
      )}
      <div className="flex items-center gap-2 ml-3.5 flex-wrap">
        {issue.projectId && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {issue.projectId.slice(0, 8)}
          </Badge>
        )}
        {agentName && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">
                {agentName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">{agentName}</span>
          </div>
        )}
        <span className="text-[10px] text-zinc-600 ml-auto">{relativeTime(issue.updatedAt)}</span>
      </div>
    </div>
  )
}

function KanbanColumn({
  label,
  color,
  issues,
  agents,
}: {
  label: string
  color: string
  issues: PaperclipIssue[]
  agents: Record<string, string>
}) {
  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('w-2 h-2 rounded-full', color)} />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded-full px-1.5 py-0.5 font-medium">
          {issues.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-[200px]">
        {issues.length === 0 ? (
          <div className="flex-1 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center">
            <p className="text-xs text-zinc-600">No tasks</p>
          </div>
        ) : (
          issues.map((issue) => <TaskCard key={issue.id} issue={issue} agents={agents} />)
        )}
      </div>
    </div>
  )
}

function ActivitySidebar({ activities }: { activities: PaperclipActivity[] }) {
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
            {activities.slice(0, 20).map((event) => (
              <div
                key={event.id}
                className="px-2 py-1.5 rounded-md hover:bg-zinc-800/50 transition-colors"
              >
                <p className="text-xs text-zinc-300 leading-snug">{event.summary}</p>
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

function NewTaskDialog({
  open,
  onOpenChange,
  companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string | undefined
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('backlog')
  const [priority, setPriority] = useState('medium')
  const createIssue = useCreateIssue(companyId)

  const handleSubmit = () => {
    if (!title.trim() || !companyId) return
    createIssue.mutate(
      { title: title.trim(), description: description.trim() || undefined, status, priority },
      {
        onSuccess: () => {
          setTitle('')
          setDescription('')
          setStatus('backlog')
          setPriority('medium')
          onOpenChange(false)
        },
      }
    )
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
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createIssue.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {createIssue.isPending ? (
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

export default function TasksPage() {
  const { companyId, status: paperclipStatus } = usePaperclip()
  const { data: issues } = useIssues(companyId)
  const { data: activities } = useActivity(companyId)
  const { data: agents } = useAgents(companyId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const agentMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (agents) {
      for (const a of agents) {
        map[a.id] = a.name
      }
    }
    return map
  }, [agents])

  const filteredIssues = useMemo(() => {
    if (!issues) return []
    return issues.filter((issue) => {
      if (filterStatus !== 'all' && mapStatusToColumn(issue.status) !== filterStatus) return false
      if (filterPriority !== 'all' && issue.priority !== filterPriority) return false
      return true
    })
  }, [issues, filterStatus, filterPriority])

  const columnIssues = useMemo(() => {
    const map: Record<string, PaperclipIssue[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    }
    for (const issue of filteredIssues) {
      const col = mapStatusToColumn(issue.status)
      if (map[col]) map[col].push(issue)
    }
    return map
  }, [filteredIssues])

  // Metrics
  const totalTasks = issues?.length ?? 0
  const inProgress = issues?.filter((i) => mapStatusToColumn(i.status) === 'in_progress').length ?? 0
  const doneTasks = issues?.filter((i) => mapStatusToColumn(i.status) === 'done').length ?? 0
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // Week tasks (created in last 7 days)
  // Use a 7-day-old cutoff based on a stable date string to avoid impure Date.now() in render
  const weekCutoff = useSyncExternalStore(
    () => () => {},
    () => Date.now() - 7 * 86_400_000,
    () => Date.now() - 7 * 86_400_000
  )
  const thisWeek = useMemo(() => {
    if (!issues) return 0
    return issues.filter((i) => new Date(i.createdAt).getTime() > weekCutoff).length
  }, [issues, weekCutoff])

  const isOffline = paperclipStatus === 'disconnected'
  const hasNoData = !issues || issues.length === 0

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Tasks"
        description="Assign, track, and review work across your autonomous agents."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
            disabled={isOffline}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Task
          </Button>
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
        <div className="ml-auto">
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
      {isOffline && hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={CheckSquare}
            title="Paperclip is offline"
            description="Tasks are managed through Paperclip. Connect to Paperclip to view and manage your task board."
          />
        </div>
      ) : hasNoData ? (
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
                issues={columnIssues[col.key] ?? []}
                agents={agentMap}
              />
            ))}
          </div>

          {/* Activity sidebar */}
          {activityOpen && (
            <div className="w-72 shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <ActivitySidebar activities={activities ?? []} />
            </div>
          )}
        </div>
      )}

      <NewTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={companyId}
      />
    </div>
  )
}
