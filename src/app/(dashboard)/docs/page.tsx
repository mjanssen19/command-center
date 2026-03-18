import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function DocsPage() {
  return (
    <div>
      <PageHeader
        title="Docs"
        description="Search, filter, and preview locally generated OpenClaw documents with full-text search and markdown rendering."
      />
      <SectionCard title="Document Library">
        <EmptyState
          icon={FileText}
          title="No documents indexed"
          description="Documents from your OpenClaw workspace will appear here once the workspace path is configured. Supports markdown, JSON, YAML, and text files."
        />
      </SectionCard>
    </div>
  )
}
