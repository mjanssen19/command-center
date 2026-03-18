import { Bot } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function AgentsPage() {
  return (
    <div>
      <PageHeader
        title="Agents"
        description="Monitor autonomous agent status, heartbeat health, and runtime sessions."
      />
      <SectionCard title="Active Agents">
        <EmptyState
          icon={Bot}
          title="No agents discovered"
          description="Agents will appear here once Paperclip is connected and running. Configure your Paperclip API URL in the environment settings."
        />
      </SectionCard>
    </div>
  )
}
