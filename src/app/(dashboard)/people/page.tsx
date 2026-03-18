import { UserCircle } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function PeoplePage() {
  return (
    <div>
      <PageHeader
        title="People"
        description="Track people and entities linked to work, reviews, outputs, and memory across your operation."
      />
      <SectionCard title="People Directory">
        <EmptyState
          icon={UserCircle}
          title="No people records"
          description="People are discovered from memory entries, document references, and manual records. Add a person to start linking them to tasks, projects, and documents."
          action={
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Add Person
            </button>
          }
        />
      </SectionCard>
    </div>
  )
}
