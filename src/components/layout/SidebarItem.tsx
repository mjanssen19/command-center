'use client'

import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SidebarItemProps {
  href: string
  icon: LucideIcon
  label: string
  isActive: boolean
}

export function SidebarItem({ href, icon: Icon, label, isActive }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-3 rounded-md h-9 text-sm transition-colors',
        isActive
          ? 'bg-zinc-800 text-zinc-100 font-medium'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}
