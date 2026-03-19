'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  GitBranch,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
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

// ── Types ──

interface PipelineItem {
  id: string
  title: string
  stage: string
  linkedEntity?: string
  assignedAgent?: string
  enteredStageAt: string
  createdAt: string
}

interface PipelineDef {
  id: string
  name: string
  stages: string[]
  items: PipelineItem[]
}

// ── Constants ──

const DEFAULT_STAGES = ['Intake', 'Processing', 'QA', 'Complete']

const STAGE_COLORS: Record<number, string> = {
  0: 'bg-zinc-500',
  1: 'bg-blue-500',
  2: 'bg-amber-500',
  3: 'bg-green-500',
}

// ── Helpers ──

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function timeInStage(enteredAt: string): string {
  const now = Date.now()
  const d = new Date(enteredAt).getTime()
  const diff = now - d
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return `${Math.floor(diff / 86_400_000)}d`
}

// ── localStorage Helpers ──

function loadPipelines(): PipelineDef[] {
  try {
    const raw = localStorage.getItem('pipeline_defs')
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return [
    {
      id: 'default',
      name: 'Default Pipeline',
      stages: DEFAULT_STAGES,
      items: [],
    },
  ]
}

function savePipelines(pipelines: PipelineDef[]) {
  try {
    localStorage.setItem('pipeline_defs', JSON.stringify(pipelines))
  } catch {
    // ignore
  }
}

// ── Work Item Card ──

function WorkItemCard({ item }: { item: PipelineItem }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors group">
      <p className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2 mb-1.5 group-hover:text-zinc-100">
        {item.title}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {item.linkedEntity && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {item.linkedEntity}
          </Badge>
        )}
        {item.assignedAgent && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">
                {item.assignedAgent.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">{item.assignedAgent}</span>
          </div>
        )}
        <span className="text-[10px] text-zinc-600 ml-auto flex items-center gap-0.5">
          <Clock className="w-3 h-3" />
          {timeInStage(item.enteredStageAt)} in stage
        </span>
      </div>
    </div>
  )
}

// ── Stage Column ──

function StageColumn({
  stage,
  stageIndex,
  items,
}: {
  stage: string
  stageIndex: number
  items: PipelineItem[]
}) {
  const color = STAGE_COLORS[stageIndex % 4] ?? 'bg-zinc-500'

  return (
    <div className="flex flex-col min-w-[240px] flex-1">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('w-2 h-2 rounded-full', color)} />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {stage}
        </span>
        <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded-full px-1.5 py-0.5 font-medium">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-[200px]">
        {items.length === 0 ? (
          <div className="flex-1 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center">
            <p className="text-xs text-zinc-600">No items</p>
          </div>
        ) : (
          items.map((item) => <WorkItemCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}

// ── Add Item Dialog ──

function AddItemDialog({
  open,
  onOpenChange,
  stages,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  stages: string[]
  onSubmit: (title: string, stage: string, linkedEntity: string) => void
}) {
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState(stages[0] || 'Intake')
  const [linkedEntity, setLinkedEntity] = useState('')

  const handleSubmit = () => {
    if (!title.trim()) return
    onSubmit(title.trim(), stage, linkedEntity.trim())
    setTitle('')
    setStage(stages[0] || 'Intake')
    setLinkedEntity('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Add Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Work item title..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Stage</label>
              <Select value={stage} onValueChange={(v) => v && setStage(v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {stages.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Linked Entity</label>
              <Input
                value={linkedEntity}
                onChange={(e) => setLinkedEntity(e.target.value)}
                placeholder="Optional link..."
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Pipeline Flow Indicator ──

function PipelineFlowIndicator({ stages }: { stages: string[] }) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 mb-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[11px] text-zinc-500 overflow-x-auto">
      <span className="font-medium text-zinc-400">Pipeline:</span>
      <span className="flex items-center gap-1 ml-2">
        {stages.map((stage, i) => (
          <span key={stage} className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  STAGE_COLORS[i % 4] ?? 'bg-zinc-500'
                )}
              />
              {stage}
            </span>
            {i < stages.length - 1 && (
              <ArrowRight className="w-3 h-3 text-zinc-700" />
            )}
          </span>
        ))}
      </span>
    </div>
  )
}

// ── Main Page ──

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<PipelineDef[]>(() => {
    if (typeof window === 'undefined') return []
    return loadPipelines()
  })
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'default'
    const loaded = loadPipelines()
    return loaded.length > 0 ? loaded[0].id : 'default'
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const mounted = typeof window !== 'undefined'

  const persist = useCallback((updated: PipelineDef[]) => {
    setPipelines(updated)
    savePipelines(updated)
  }, [])

  const currentPipeline = pipelines.find((p) => p.id === selectedPipelineId) ?? pipelines[0]

  const stageItems = useMemo(() => {
    if (!currentPipeline) return {}
    const map: Record<string, PipelineItem[]> = {}
    for (const s of currentPipeline.stages) {
      map[s] = []
    }
    for (const item of currentPipeline.items) {
      if (map[item.stage]) map[item.stage].push(item)
    }
    return map
  }, [currentPipeline])

  const handleAddItem = useCallback(
    (title: string, stage: string, linkedEntity: string) => {
      if (!currentPipeline) return
      const newItem: PipelineItem = {
        id: generateId(),
        title,
        stage,
        linkedEntity: linkedEntity || undefined,
        enteredStageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      const updated = pipelines.map((p) => {
        if (p.id !== currentPipeline.id) return p
        return { ...p, items: [...p.items, newItem] }
      })
      persist(updated)
    },
    [pipelines, currentPipeline, persist]
  )

  if (!mounted) return null

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Pipeline"
        description="Stage-based workflow boards for repeatable processes."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Item
          </Button>
        }
      />

      {/* Pipeline selector */}
      {pipelines.length > 1 && (
        <div className="mb-4">
          <Select
            value={selectedPipelineId}
            onValueChange={(v) => v && setSelectedPipelineId(v)}
          >
            <SelectTrigger className="w-[200px] h-8 text-xs bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {currentPipeline && <PipelineFlowIndicator stages={currentPipeline.stages} />}

      {/* Pipeline board */}
      {!currentPipeline || currentPipeline.items.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={GitBranch}
            title="Pipeline is empty"
            description="Add work items to move them through the pipeline stages. Items track time in each stage and can link to tasks or content."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex gap-4 flex-1 overflow-x-auto pb-2">
          {currentPipeline.stages.map((stage, i) => (
            <StageColumn
              key={stage}
              stage={stage}
              stageIndex={i}
              items={stageItems[stage] ?? []}
            />
          ))}
        </div>
      )}

      {currentPipeline && (
        <AddItemDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          stages={currentPipeline.stages}
          onSubmit={handleAddItem}
        />
      )}
    </div>
  )
}
