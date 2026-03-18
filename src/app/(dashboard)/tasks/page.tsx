import { CheckSquare } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function TasksPage() {
  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Assign, track, and review work across your autonomous agents."
      />
      <SectionCard title="Task Board">
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Create your first task to get started. Tasks assigned to agents will appear on the board as they are picked up."
          action={
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              New Task
            </button>
          }
        />
      </SectionCard>
    </div>
  )
}
