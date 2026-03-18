import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandBarWrapper } from '../search/CommandBarWrapper'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-zinc-950">
          <div className="max-w-[1400px] mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
      <CommandBarWrapper />
    </div>
  )
}
