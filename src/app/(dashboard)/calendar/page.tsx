'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Circle,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePaperclip } from '@/lib/paperclip'
import { useIssues } from '@/lib/paperclip/hooks'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { cn } from '@/lib/utils/cn'
import type { ScheduleJob } from '@/lib/entities/types'
import type { PaperclipIssue } from '@/lib/paperclip/types'

// Event types for the calendar
interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  type: 'task' | 'schedule' | 'milestone' | 'external'
  source: string
  meta?: string
}

const EVENT_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  task: { dot: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  schedule: { dot: 'bg-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  milestone: { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  external: { dot: 'bg-zinc-400', bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function todayKey(): string {
  return toDateKey(new Date())
}

function DayCell({
  day,
  isCurrentMonth,
  isToday,
  events,
  isSelected,
  onClick,
}: {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-start p-1.5 min-h-[80px] border border-zinc-800/50 transition-colors rounded-md',
        isCurrentMonth ? 'bg-zinc-900/50' : 'bg-zinc-950/30',
        isToday && 'border-indigo-500/50',
        isSelected && 'bg-zinc-800/60 border-indigo-500/70',
        isCurrentMonth ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-900/40'
      )}
    >
      <span
        className={cn(
          'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
          isToday && 'bg-indigo-600 text-white',
          !isToday && isCurrentMonth && 'text-zinc-300',
          !isToday && !isCurrentMonth && 'text-zinc-600'
        )}
      >
        {day}
      </span>

      {/* Event dots */}
      {events.length > 0 && (
        <div className="flex gap-0.5 mt-1 flex-wrap px-0.5">
          {events.slice(0, 4).map((ev) => (
            <div
              key={ev.id}
              className={cn('w-1.5 h-1.5 rounded-full', EVENT_COLORS[ev.type]?.dot ?? 'bg-zinc-500')}
              title={ev.title}
            />
          ))}
          {events.length > 4 && (
            <span className="text-[8px] text-zinc-500 ml-0.5">+{events.length - 4}</span>
          )}
        </div>
      )}
    </button>
  )
}

function EventItem({ event }: { event: CalendarEvent }) {
  const colors = EVENT_COLORS[event.type] ?? EVENT_COLORS['task']

  return (
    <div className={cn('flex items-start gap-2 px-3 py-2 rounded-md', colors.bg)}>
      <Circle className={cn('w-2 h-2 mt-1 shrink-0 fill-current', colors.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium', colors.text)}>{event.title}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">
          {event.source}
          {event.meta ? ` \u00B7 ${event.meta}` : ''}
        </p>
      </div>
      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 shrink-0">
        {event.type}
      </Badge>
    </div>
  )
}

interface ExternalCalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  location?: string
  description?: string
}

function useExternalCalendarEvents() {
  const [events, setEvents] = useState<ExternalCalendarEvent[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/integrations?type=calendar')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ExternalCalendarEvent[]) => {
        if (!cancelled) setEvents(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return events
}

export default function CalendarPage() {
  const { companyId } = usePaperclip()
  const { data: issues } = useIssues(companyId)
  const { data: scheduleJobs } = useLocalData<ScheduleJob>('schedule_jobs')
  const externalCalendarEvents = useExternalCalendarEvents()

  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey())

  // Build events from all sources
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = []

    // Paperclip issues with due dates (using updatedAt as proxy if no explicit dueDate)
    if (issues) {
      for (const issue of issues) {
        const issueTyped = issue as PaperclipIssue & { dueDate?: string }
        const dateStr = issueTyped.dueDate || issue.updatedAt
        if (dateStr) {
          events.push({
            id: `task-${issue.id}`,
            title: issue.title,
            date: dateStr.slice(0, 10),
            type: 'task',
            source: 'Paperclip',
            meta: issue.status,
          })
        }
      }
    }

    // Local schedule jobs
    if (scheduleJobs) {
      for (const job of scheduleJobs) {
        if (job.nextRun) {
          events.push({
            id: `schedule-${job.id}`,
            title: job.name,
            date: job.nextRun.slice(0, 10),
            type: 'schedule',
            source: 'Local schedule',
            meta: job.status,
          })
        }
        if (job.lastRun) {
          events.push({
            id: `schedule-last-${job.id}`,
            title: `${job.name} (last run)`,
            date: job.lastRun.slice(0, 10),
            type: 'schedule',
            source: 'Local schedule',
            meta: job.status,
          })
        }
      }
    }

    // External calendar events (ICS feed)
    for (const ext of externalCalendarEvents) {
      if (ext.start) {
        events.push({
          id: `ext-${ext.id}`,
          title: ext.title,
          date: ext.start.slice(0, 10),
          type: 'external',
          source: 'External Calendar',
          meta: ext.location || undefined,
        })
      }
    }

    return events
  }, [issues, scheduleJobs, externalCalendarEvents])

  // Map events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of allEvents) {
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev)
    }
    return map
  }, [allEvents])

  // Calendar grid computation
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  // Previous month fill
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

  const calendarCells = useMemo(() => {
    const cells: {
      day: number
      month: number
      year: number
      isCurrentMonth: boolean
      dateKey: string
    }[] = []

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const dk = toDateKey(new Date(prevYear, prevMonth, d))
      cells.push({ day: d, month: prevMonth, year: prevYear, isCurrentMonth: false, dateKey: dk })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = toDateKey(new Date(currentYear, currentMonth, d))
      cells.push({
        day: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        dateKey: dk,
      })
    }

    // Next month leading days
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
    const remaining = 42 - cells.length // 6 rows x 7 columns
    for (let d = 1; d <= remaining; d++) {
      const dk = toDateKey(new Date(nextYear, nextMonth, d))
      cells.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false, dateKey: dk })
    }

    return cells
  }, [currentYear, currentMonth, daysInMonth, firstDay, daysInPrevMonth, prevMonth, prevYear])

  // Navigation
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
    setSelectedDate(todayKey())
  }

  // Events for selected day
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return []
    return eventsByDate[selectedDate] ?? []
  }, [selectedDate, eventsByDate])

  // Event counts for metrics
  const taskEvents = allEvents.filter((e) => e.type === 'task').length
  const scheduleEvents = allEvents.filter((e) => e.type === 'schedule').length
  const externalEventCount = allEvents.filter((e) => e.type === 'external').length

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Calendar"
        description="View project milestones, task due dates, review deadlines, and scheduled autonomous jobs in one place."
      />

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Main calendar grid */}
        <div className="flex-1 flex flex-col">
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-zinc-200">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevMonth}
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextMonth}
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Today
              </Button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-zinc-500">Tasks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-[10px] text-zinc-500">Schedules</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] text-zinc-500">Milestones</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-400" />
                <span className="text-[10px] text-zinc-500">External</span>
              </div>
            </div>
          </div>

          {/* Day names header */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {DAY_NAMES.map((name) => (
              <div key={name} className="text-center py-1.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {name}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px flex-1">
            {calendarCells.map((cell) => (
              <DayCell
                key={cell.dateKey}
                day={cell.day}
                isCurrentMonth={cell.isCurrentMonth}
                isToday={cell.dateKey === todayKey()}
                events={eventsByDate[cell.dateKey] ?? []}
                isSelected={cell.dateKey === selectedDate}
                onClick={() => setSelectedDate(cell.dateKey)}
              />
            ))}
          </div>
        </div>

        {/* Day detail sidebar */}
        <div className="w-80 shrink-0">
          <SectionCard
            title={
              selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Select a day'
            }
            action={
              selectedEvents.length > 0 ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {selectedEvents.length}
                </Badge>
              ) : undefined
            }
          >
            <ScrollArea className="max-h-[calc(100vh-360px)]">
              {selectedEvents.length === 0 ? (
                <div className="py-6 text-center">
                  <CalendarDays className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">No events scheduled</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev) => (
                    <EventItem key={ev.id} event={ev} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </SectionCard>

          {/* Summary counts */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-[10px] text-zinc-500 mb-0.5">Tasks</p>
              <p className="text-lg font-bold text-blue-400">{taskEvents}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-[10px] text-zinc-500 mb-0.5">Schedules</p>
              <p className="text-lg font-bold text-violet-400">{scheduleEvents}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-[10px] text-zinc-500 mb-0.5">External</p>
              <p className="text-lg font-bold text-zinc-400">{externalEventCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
