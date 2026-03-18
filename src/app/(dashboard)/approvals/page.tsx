import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function ApprovalsPage() {
  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Review and action pending approval requests from your agents before important work proceeds."
      />
      <SectionCard title="Pending Approvals">
        <EmptyState
          icon={ShieldCheck}
          title="No pending approvals"
          description="Approval requests from agents will appear here. Agents can request review before sending drafts, publishing content, or completing project gates."
        />
      </SectionCard>
    </div>
  )
}
