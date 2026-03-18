import { FolderKanban } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage active projects, track progress, and review blockers, milestones, and linked work."
      />
      <SectionCard title="All Projects">
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Projects from Paperclip will appear here. Each project shows status, progress, owner agent, priority, and linked tasks, documents, and approvals."
        />
      </SectionCard>
    </div>
  )
}
