import { Radio } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function RadarPage() {
  return (
    <div>
      <PageHeader
        title="Radar"
        description="Track monitored trends, signals, opportunities, and recurring scans detected by your agents."
      />
      <SectionCard title="Signal Feed">
        <EmptyState
          icon={Radio}
          title="No signals detected"
          description="Radar signals are written by OpenClaw agents during their monitoring routines. Signals are grouped by topic and source with priority indicators."
        />
      </SectionCard>
    </div>
  )
}
