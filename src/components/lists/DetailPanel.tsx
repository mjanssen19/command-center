interface DetailPanelProps {
  children: React.ReactNode
}

export function DetailPanel({ children }: DetailPanelProps) {
  return <div className="flex-1 h-full overflow-y-auto bg-zinc-950 p-4">{children}</div>
}
