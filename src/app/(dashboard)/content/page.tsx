import { Newspaper } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function ContentPage() {
  return (
    <div>
      <PageHeader
        title="Content"
        description="Track content workflows from idea through draft, review, scheduling, and publication across channels."
      />
      <SectionCard title="Content Pipeline">
        <EmptyState
          icon={Newspaper}
          title="No content items"
          description="Content items move through stages: Idea, Draft, Review, Scheduled, Published. Create an idea to start a content workflow."
          action={
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              New Idea
            </button>
          }
        />
      </SectionCard>
    </div>
  )
}
