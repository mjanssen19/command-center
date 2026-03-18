'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  Plus,
  Loader2,
  Calendar,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
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
import type { ScheduleJob } from '@/lib/entities/types'

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Active' },
  paused: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Paused' },
  error: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Error' },
}

function humanizeCron(cron: string | null): string {
  if (!cron) return 'Manual trigger'
  const parts = cron.split(' ')
  if (parts.length !== 5) return cron

  const [min, hour, dom, mon, dow] = parts

  // Common patterns
  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*') return 'Every hour'
  if (min !== '*' && hour === '*' && dom === '*' && mon === '*' && dow === '*')
    return `Every hour at :${min.padStart(2, '0')}`
  if (dom === '*' && mon === '*' && dow === '*' && hour !== '*' && min !== '*')
    return `Daily at ${hour}:${min.padStart(2, '0')}`
  if (dom === '*' && mon === '*' && dow === '1-5' && hour !== '*')
    return `Weekdays at ${hour}:${min.padStart(2, '0')}`
  if (dom === '*' && mon === '*' && dow === '0' && hour !== '*')
    return `Sundays at ${hour}:${min.padStart(2, '0')}`
  if (dom === '*' && mon === '*' && dow === '1' && hour !== '*')
    return `Mondays at ${hour}:${min.padStart(2, '0')}`
  if (min.startsWith('*/'))
    return `Every ${min.slice(2)} minutes`
  if (hour.startsWith('*/'))
    return `Every ${hour.slice(2)} hours`

  return cron
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  if (diff < 0) {
    const absDiff = Math.abs(diff)
    if (absDiff < 3_600_000) return `in ${Math.floor(absDiff / 60_000)}m`
    if (absDiff < 86_400_000) return `in ${Math.floor(absDiff / 3_600_000)}h`
    return `in ${Math.floor(absDiff / 86_400_000)}d`
  }
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function getJobDayHours(cron: string | null): Array<{ day: number; hour: number }> {
  if (!cron) return []
  const parts = cron.split(' ')
  if (parts.length !== 5) return []
  const [, hour, , , dow] = parts

  const hours: number[] = []
  if (hour === '*') {
    for (let i = 0; i < 24; i++) hours.push(i)
  } else if (hour.startsWith('*/')) {
    const step = parseInt(hour.slice(2))
    for (let i = 0; i < 24; i += step) hours.push(i)
  } else {
    hours.push(parseInt(hour))
  }

  const days: number[] = []
  if (dow === '*') {
    for (let i = 0; i < 7; i++) days.push(i)
  } else if (dow === '1-5') {
    for (let i = 0; i < 5; i++) days.push(i)
  } else {
    const d = parseInt(dow)
    // Convert cron day (0=Sun) to our array (0=Mon)
    days.push(d === 0 ? 6 : d - 1)
  }

  const result: Array<{ day: number; hour: number }> = []
  for (const d of days) {
    for (const h of hours) {
      result.push({ day: d, hour: h })
    }
  }
  return result
}

function WeeklyGrid({ jobs }: { jobs: ScheduleJob[] }) {
  const activeJobs = jobs.filter((j) => j.status === 'active' && j.cron)
  const allSlots = new Set<string>()
  const slotJobs: Record<string, string[]> = {}

  for (const job of activeJobs) {
    const dayHours = getJobDayHours(job.cron)
    for (const { day, hour } of dayHours) {
      const key = `${day}-${hour}`
      allSlots.add(key)
      if (!slotJobs[key]) slotJobs[key] = []
      slotJobs[key].push(job.name)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Weekly Schedule Grid
        </h3>
      </div>
      <div className="p-3 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="flex">
            <div className="w-10 shrink-0" />
            {HOURS.filter((h) => h % 3 === 0).map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-[9px] text-zinc-600 pb-1"
                style={{ minWidth: '24px' }}
              >
                {h.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
          {/* Rows */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex items-center">
              <div className="w-10 shrink-0 text-[10px] text-zinc-500 pr-2 text-right">
                {day}
              </div>
              <div className="flex flex-1 gap-px">
                {HOURS.map((h) => {
                  const key = `${dayIdx}-${h}`
                  const hasJob = allSlots.has(key)
                  return (
                    <div
                      key={h}
                      className={cn(
                        'h-4 flex-1 rounded-sm min-w-[3px]',
                        hasJob ? 'bg-indigo-500/40' : 'bg-zinc-800/50'
                      )}
                      title={hasJob ? slotJobs[key]?.join(', ') : undefined}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NewScheduleDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [cron, setCron] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/local/schedule_jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          cron: cron.trim() || null,
          description: description.trim(),
          status: 'active',
          nextRun: null,
          lastRun: null,
        }),
      })
      if (res.ok) {
        setName('')
        setCron('')
        setDescription('')
        onOpenChange(false)
        onCreated()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">New Schedule</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Daily report generation..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Cron Expression</label>
            <Input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="0 9 * * * (daily at 9am)"
              className="bg-zinc-800 border-zinc-700 text-zinc-200 font-mono text-xs"
            />
            {cron && (
              <p className="text-[10px] text-zinc-500 mt-1">{humanizeCron(cron)}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this job do?"
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
            disabled={!name.trim() || saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {saving ? (
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

export default function SchedulingPage() {
  const [jobs, setJobs] = useState<ScheduleJob[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/local/schedule_jobs')
      if (res.ok) {
        const data = await res.json()
        setJobs(data.items ?? [])
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  return (
    <div>
      <PageHeader
        title="Scheduling"
        description="Manage autonomous routines, cron jobs, recurring workflows, and scheduled agent work."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Schedule
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={Clock}
            title="No scheduled jobs"
            description="Recurring routines and cron-based jobs will appear here. Create a schedule to automate agent work."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Schedule
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Schedule list */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_120px_120px_80px] gap-2 px-4 py-2.5 border-b border-zinc-800 text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
              <div>Job</div>
              <div>Frequency</div>
              <div>Next Run</div>
              <div>Last Run</div>
              <div>Status</div>
            </div>
            <div className="divide-y divide-zinc-800">
              {jobs.map((job) => {
                const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.paused
                return (
                  <div
                    key={job.id}
                    className="grid grid-cols-[1fr_160px_120px_120px_80px] gap-2 px-4 py-3 items-center hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{job.name}</p>
                      {job.description && (
                        <p className="text-[10px] text-zinc-600 truncate">{job.description}</p>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 font-mono">
                      {humanizeCron(job.cron)}
                    </div>
                    <div className="text-xs text-zinc-500">{relativeTime(job.nextRun)}</div>
                    <div className="text-xs text-zinc-500">{relativeTime(job.lastRun)}</div>
                    <div>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-1.5 py-0 h-4 border', statusCfg.color)}
                      >
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Weekly grid */}
          <WeeklyGrid jobs={jobs} />
        </div>
      )}

      <NewScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchJobs}
      />
    </div>
  )
}
