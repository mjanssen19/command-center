'use client'

import { useState, useCallback } from 'react'
import {
  Plus,
  Factory,
  ChevronDown,
  ChevronRight,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// ── Types ──

interface FactorySystem {
  id: string
  name: string
  description: string
  steps: string[]
  lastRun: string | null
  outputCount: number
  qualityStatus: 'good' | 'warning' | 'error' | 'unknown'
  createdAt: string
}

// ── Helpers ──

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ── localStorage Helpers ──

function loadSystems(): FactorySystem[] {
  try {
    const raw = localStorage.getItem('factory_systems')
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return []
}

function saveSystems(systems: FactorySystem[]) {
  try {
    localStorage.setItem('factory_systems', JSON.stringify(systems))
  } catch {
    // ignore
  }
}

// ── Quality Badge ──

const QUALITY_COLORS: Record<string, string> = {
  good: 'bg-green-900/50 text-green-300',
  warning: 'bg-amber-900/50 text-amber-300',
  error: 'bg-red-900/50 text-red-300',
  unknown: 'bg-zinc-700 text-zinc-400',
}

const QUALITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  good: CheckCircle2,
  warning: AlertCircle,
  error: AlertCircle,
  unknown: Clock,
}

// ── System Card ──

function SystemCard({
  system,
  isExpanded,
  onToggle,
}: {
  system: FactorySystem
  isExpanded: boolean
  onToggle: () => void
}) {
  const QualityIcon = QUALITY_ICONS[system.qualityStatus] ?? Clock

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
        )}
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
          <Factory className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-200 truncate">{system.name}</p>
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5',
                QUALITY_COLORS[system.qualityStatus]
              )}
            >
              <QualityIcon className="w-3 h-3" />
              {system.qualityStatus}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-zinc-500">
              {system.steps.length} step{system.steps.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Play className="w-3 h-3" />
              {system.outputCount} outputs
            </span>
            {system.lastRun && (
              <span className="text-[10px] text-zinc-600">
                Last run: {relativeTime(system.lastRun)}
              </span>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-800">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Description
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">{system.description}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Pipeline Steps ({system.steps.length})
            </p>
            {system.steps.length === 0 ? (
              <p className="text-xs text-zinc-600">No steps defined</p>
            ) : (
              <ol className="space-y-1.5">
                {system.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800 rounded px-1 py-0.5 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs text-zinc-400">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── New System Dialog ──

function NewSystemDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, description: string, steps: string[]) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stepsText, setStepsText] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) return
    const steps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    onSubmit(name.trim(), description.trim(), steps)
    setName('')
    setDescription('')
    setStepsText('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">New System</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="System name..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this system produce?"
              className="bg-zinc-800 border-zinc-700 text-zinc-200 min-h-[60px]"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">
              Pipeline Steps (one per line)
            </label>
            <Textarea
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder={"Gather sources\nGenerate draft\nEdit and review\nPublish"}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 min-h-[100px] font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──

export default function FactoryPage() {
  const [systems, setSystems] = useState<FactorySystem[]>(() => {
    if (typeof window === 'undefined') return []
    return loadSystems()
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const mounted = typeof window !== 'undefined'

  const persist = useCallback((updated: FactorySystem[]) => {
    setSystems(updated)
    saveSystems(updated)
  }, [])

  const handleNewSystem = useCallback(
    (name: string, description: string, steps: string[]) => {
      const newSystem: FactorySystem = {
        id: generateId(),
        name,
        description,
        steps,
        lastRun: null,
        outputCount: 0,
        qualityStatus: 'unknown',
        createdAt: new Date().toISOString(),
      }
      persist([newSystem, ...systems])
    },
    [systems, persist]
  )

  if (!mounted) return null

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Factory"
        description="Repeatable generation systems and production loops."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New System
          </Button>
        }
      />

      {systems.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={Factory}
            title="No factory systems"
            description="Create a production system to define repeatable generation workflows. Each system tracks pipeline steps, run history, and output quality."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New System
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pb-2">
          {systems.map((system) => (
            <SystemCard
              key={system.id}
              system={system}
              isExpanded={expandedId === system.id}
              onToggle={() =>
                setExpandedId(expandedId === system.id ? null : system.id)
              }
            />
          ))}
        </div>
      )}

      <NewSystemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleNewSystem}
      />
    </div>
  )
}
