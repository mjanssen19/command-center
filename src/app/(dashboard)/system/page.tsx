import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function SystemPage() {
  return (
    <div>
      <PageHeader
        title="System"
        description="Monitor health, file indexing status, integration states, scheduler activity, and environment details."
      />
      <div className="space-y-4">
        <SectionCard title="Paperclip Connection">
          <EmptyState
            icon={Settings}
            title="Paperclip not connected"
            description="Set PAPERCLIP_API_URL and PAPERCLIP_API_KEY in your .env.local file to connect to Paperclip. The app will degrade gracefully until a connection is established."
          />
        </SectionCard>
        <SectionCard title="File Indexer">
          <EmptyState
            icon={Settings}
            title="Workspace not configured"
            description="Set OPENCLAW_WORKSPACE_PATH in your .env.local file to enable file indexing. The indexer scans markdown, JSON, YAML, and text files on startup."
          />
        </SectionCard>
      </div>
    </div>
  )
}
