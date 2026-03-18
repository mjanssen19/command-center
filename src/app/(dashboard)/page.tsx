import Link from 'next/link'
import {
  CheckSquare,
  Bot,
  FolderKanban,
  ShieldCheck,
  Brain,
  FileText,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'

const quickLinks = [
  {
    href: '/tasks',
    icon: CheckSquare,
    title: 'Tasks',
    description: 'Assign, track, and review work across your autonomous agents.',
  },
  {
    href: '/agents',
    icon: Bot,
    title: 'Agents',
    description: 'Monitor agent status, heartbeat health, and runtime sessions.',
  },
  {
    href: '/projects',
    icon: FolderKanban,
    title: 'Projects',
    description: 'Manage projects, milestones, and progress across all work.',
  },
  {
    href: '/approvals',
    icon: ShieldCheck,
    title: 'Approvals',
    description: 'Review and approve pending requests from your agents.',
  },
  {
    href: '/memory',
    icon: Brain,
    title: 'Memory',
    description: 'Browse accumulated intelligence from your OpenClaw sessions.',
  },
  {
    href: '/docs',
    icon: FileText,
    title: 'Docs',
    description: 'Search and preview locally generated documents and files.',
  },
]

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Command Center"
        description="Your operational dashboard for OpenClaw and Paperclip."
      />

      {/* Quick-link cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {quickLinks.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-md bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center shrink-0 transition-colors">
                <Icon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{item.description}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* System status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">
          System Status
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-600" />
            <span className="text-sm text-zinc-400">Paperclip: Not connected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-600" />
            <span className="text-sm text-zinc-400">File index: Not configured</span>
          </div>
        </div>
      </div>
    </div>
  )
}
