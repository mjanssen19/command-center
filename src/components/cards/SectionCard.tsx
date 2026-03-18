interface SectionCardProps {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
