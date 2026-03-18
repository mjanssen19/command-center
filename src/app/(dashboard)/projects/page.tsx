'use client'

import { useState, useMemo } from 'react'
import {
  FolderKanban,
  ArrowLeft,
  CheckSquare,
  FileText,
  Clock,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { PaperclipOfflineBanner } from '@/components/common/PaperclipOfflineBanner'
import { usePaperclip } from '@/lib/paperclip'
import { useProjects, useIssues } from '@/lib/paperclip/hooks'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PaperclipProject, PaperclipIssue } from '@/lib/paperclip/types'

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
  onClick,
}: {
  project: PaperclipProject
  taskCount: number
  doneCount: number
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
        <Badge
          variant="outline"
          className={cn('text-[10px] px-1.5 py-0 h-4 border shrink-0', statusCfg.color)}
        >
          {statusCfg.label}
        </Badge>
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
  issues,
  onBack,
}: {
  project: PaperclipProject
  issues: PaperclipIssue[]
  onBack: () => void
}) {
  const statusCfg = PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.active
  const projectIssues = issues.filter((i) => i.projectId === project.id)
  const doneCount = projectIssues.filter(
    (i) => i.status.toLowerCase() === 'done' || i.status.toLowerCase() === 'completed'
  ).length
  const progress =
    projectIssues.length > 0 ? Math.round((doneCount / projectIssues.length) * 100) : 0

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
          <Badge
            variant="outline"
            className={cn('text-xs px-2 py-0.5 border', statusCfg.color)}
          >
            {statusCfg.label}
          </Badge>
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
                return (
                  <div
                    key={issue.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', priorityColor)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{issue.title}</p>
                      {issue.description && (
                        <p className="text-[10px] text-zinc-600 truncate">{issue.description}</p>
                      )}
                    </div>
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

export default function ProjectsPage() {
  const { companyId, status: paperclipStatus } = usePaperclip()
  const { data: projects } = useProjects(companyId)
  const { data: issues } = useIssues(companyId)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const isOffline = paperclipStatus === 'disconnected'
  const hasNoData = !projects || projects.length === 0

  const taskCounts = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {}
    if (issues) {
      for (const issue of issues) {
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
  }, [issues])

  const selectedProject = projects?.find((p) => p.id === selectedProjectId)

  if (selectedProject) {
    return (
      <div>
        <ProjectDetail
          project={selectedProject}
          issues={issues ?? []}
          onBack={() => setSelectedProjectId(null)}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage active projects, track progress, and review blockers, milestones, and linked work."
      />

      <PaperclipOfflineBanner />

      {isOffline && hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={FolderKanban}
            title="Paperclip is offline"
            description="Projects are managed through Paperclip. Connect to Paperclip to view your projects."
          />
        </div>
      ) : hasNoData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={FolderKanban}
            title="No projects found"
            description="Projects from Paperclip will appear here. Each project shows status, progress, and linked tasks."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {projects.map((project) => {
            const counts = taskCounts[project.id] ?? { total: 0, done: 0 }
            return (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={counts.total}
                doneCount={counts.done}
                onClick={() => setSelectedProjectId(project.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
