import { GitBranch } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/cards/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'

export default function PipelinePage() {
  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Stage-based movement of work across repeatable processes, separate from the task kanban."
      />
      <SectionCard title="Pipeline Stages">
        <EmptyState
          icon={GitBranch}
          title="No pipelines defined"
          description="Pipelines represent stage-based process workflows. Work items move through custom columns and can link to tasks and content items."
          action={
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              New Pipeline
            </button>
          }
        />
      </SectionCard>
    </div>
  )
}
