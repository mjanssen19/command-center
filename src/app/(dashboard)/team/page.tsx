import { Network } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function TeamPage() {
  return (
    <div>
      <PageHeader
        title="Team"
        description="View your agent org structure, hierarchy, responsibilities, capabilities, and runtime placement."
      />
      <SectionCard title="Organization Structure">
        <EmptyState
          icon={Network}
          title="No agent hierarchy discovered"
          description="The agent org structure will populate from Paperclip once connected. This shows top-level roles, sub-agents, capabilities, models, and machine placement."
        />
      </SectionCard>
    </div>
  )
}
