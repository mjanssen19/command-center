'use client'

import { usePathname } from 'next/navigation'
import {
  Terminal,
  CheckSquare,
  Bot,
  ShieldCheck,
  Users,
  FolderKanban,
  Clock,
  CalendarDays,
  Brain,
  FileText,
  UserCircle,
  Network,
  Newspaper,
  Radio,
  Factory,
  GitBranch,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { SidebarItem } from './SidebarItem'

const navGroups = [
  {
    label: 'Operations',
    items: [
      { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
      { href: '/agents', icon: Bot, label: 'Agents' },
      { href: '/approvals', icon: ShieldCheck, label: 'Approvals' },
      { href: '/council', icon: Users, label: 'Council' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { href: '/projects', icon: FolderKanban, label: 'Projects' },
      { href: '/scheduling', icon: Clock, label: 'Scheduling' },
      { href: '/calendar', icon: CalendarDays, label: 'Calendar' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { href: '/memory', icon: Brain, label: 'Memory' },
      { href: '/docs', icon: FileText, label: 'Docs' },
      { href: '/people', icon: UserCircle, label: 'People' },
      { href: '/team', icon: Network, label: 'Team' },
    ],
  },
  {
    label: 'Systems',
    items: [
      { href: '/content', icon: Newspaper, label: 'Content' },
      { href: '/radar', icon: Radio, label: 'Radar' },
      { href: '/factory', icon: Factory, label: 'Factory' },
      { href: '/pipeline', icon: GitBranch, label: 'Pipeline' },
      { href: '/feedback', icon: MessageSquare, label: 'Feedback' },
      { href: '/system', icon: Settings, label: 'System' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 h-screen flex flex-col bg-zinc-950 border-r border-zinc-800 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-[52px] border-b border-zinc-800 shrink-0">
        <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="text-sm font-semibold text-zinc-100 tracking-tight">Command Center</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-4">
        {navGroups.map((group, groupIdx) => (
          <div key={group.label}>
            {groupIdx > 0 && <div className="h-px bg-zinc-800 mb-4" />}
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
