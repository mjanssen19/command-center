import { CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function CalendarPage() {
  return (
    <div>
      <PageHeader
        title="Calendar"
        description="View project milestones, task due dates, review deadlines, and scheduled autonomous jobs in one place."
      />
      <SectionCard title="Upcoming Events">
        <EmptyState
          icon={CalendarDays}
          title="No events to display"
          description="Project milestones, task due dates, agent schedule jobs, and external calendar events will appear here once data sources are configured."
        />
      </SectionCard>
    </div>
  )
}
