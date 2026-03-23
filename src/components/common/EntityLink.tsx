'use client'

import { useRouter } from 'next/navigation'
import {
  User,
  CheckSquare,
  Folder,
  Shield,
  Clock,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type EntityLinkType =
  | 'agent'
  | 'issue'
  | 'project'
  | 'approval'
  | 'schedule'
  | 'council_proposal'

const ENTITY_CONFIG: Record<
  EntityLinkType,
  { icon: React.ElementType; path: string; label: string }
> = {
  agent: { icon: User, path: '/agents', label: 'Agent' },
  issue: { icon: CheckSquare, path: '/tasks', label: 'Task' },
  project: { icon: Folder, path: '/projects', label: 'Project' },
  approval: { icon: Shield, path: '/approvals', label: 'Approval' },
  schedule: { icon: Clock, path: '/scheduling', label: 'Schedule' },
  council_proposal: { icon: Users, path: '/council', label: 'Proposal' },
}

export function EntityLink({
  type,
  id,
  label,
  emoji,
  className,
}: {
  type: EntityLinkType
  id: string
  label: string
  emoji?: string | null
  className?: string
}) {
  const router = useRouter()
  const config = ENTITY_CONFIG[type]
  if (!config) return null

  const Icon = config.icon

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`${config.path}?selected=${id}`)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md',
        'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-200',
        'text-[10px] transition-colors cursor-pointer border border-zinc-700/50',
        className
      )}
      title={`Go to ${config.label}: ${label}`}
    >
      {emoji ? (
        <span className="text-[10px]">{emoji}</span>
      ) : (
        <Icon className="w-2.5 h-2.5 text-zinc-500" />
      )}
      <span className="truncate max-w-[120px]">{label}</span>
    </button>
  )
}
