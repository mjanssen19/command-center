interface ListPanelProps {
  children: React.ReactNode
  width?: string
}

export function ListPanel({ children, width = 'w-72' }: ListPanelProps) {
  return (
    <div
      className={`${width} shrink-0 h-full border-r border-zinc-800 overflow-y-auto bg-zinc-900`}
    >
      {children}
    </div>
  )
}
