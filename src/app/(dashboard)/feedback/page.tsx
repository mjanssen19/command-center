import { MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function FeedbackPage() {
  return (
    <div>
      <PageHeader
        title="Feedback"
        description="Collect agent self-critique, rejected outputs, post-mortems, review notes, and quality ratings."
      />
      <SectionCard title="Feedback Log">
        <EmptyState
          icon={MessageSquare}
          title="No feedback recorded"
          description="Feedback items are created from task, document, and content detail views. They capture rejection reasons, post-mortems, review notes, and agent self-critique."
          action={
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Add Feedback
            </button>
          }
        />
      </SectionCard>
    </div>
  )
}
