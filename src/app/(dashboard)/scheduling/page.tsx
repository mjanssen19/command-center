import { Clock } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function SchedulingPage() {
  return (
    <div>
      <PageHeader
        title="Scheduling"
        description="Manage autonomous routines, cron jobs, recurring workflows, and scheduled agent work."
      />
      <SectionCard title="Scheduled Jobs">
        <EmptyState
          icon={Clock}
          title="No scheduled jobs"
          description="Recurring routines and cron-based jobs will appear here. Each job shows its frequency, next run time, linked project or agent, and execution history."
          action={
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              New Schedule
            </button>
          }
        />
      </SectionCard>
    </div>
  )
}
