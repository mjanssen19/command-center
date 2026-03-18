import { Factory } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function FactoryPage() {
  return (
    <div>
      <PageHeader
        title="Factory"
        description="Manage repeatable generation systems, production loops, and quality-gated output workflows."
      />
      <SectionCard title="Production Systems">
        <EmptyState
          icon={Factory}
          title="No factory systems configured"
          description="Factory systems represent repeatable generation workflows — each links to a content pipeline and schedule job, and tracks last run, output count, and quality gate status."
          action={
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              New System
            </button>
          }
        />
      </SectionCard>
    </div>
  )
}
