import { Brain } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function MemoryPage() {
  return (
    <div>
      <PageHeader
        title="Memory"
        description="Browse accumulated intelligence from your OpenClaw sessions, grouped by date with source attribution."
      />
      <SectionCard title="Memory Timeline">
        <EmptyState
          icon={Brain}
          title="No memory entries indexed"
          description="Memory entries from OpenClaw sessions will appear here once the workspace path is configured. Set OPENCLAW_WORKSPACE_PATH in your environment to begin indexing."
        />
      </SectionCard>
    </div>
  )
}
