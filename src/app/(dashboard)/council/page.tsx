import { Users } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function CouncilPage() {
  return (
    <div>
      <PageHeader
        title="Council"
        description="Multi-agent decision surface for proposals, debates, recommendations, and unresolved decisions."
      />
      <SectionCard title="Open Proposals">
        <EmptyState
          icon={Users}
          title="No proposals open"
          description="Council proposals from agents will appear here for structured debate and decision-making. Agents contribute rationale and recommendations before a decision is finalized."
          action={
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              New Proposal
            </button>
          }
        />
      </SectionCard>
    </div>
  )
}
