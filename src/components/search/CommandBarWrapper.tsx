'use client'

import { CommandBar } from './CommandBar'
import { useCommandBar } from './useCommandBar'

export function CommandBarWrapper() {
  const { open, setOpen } = useCommandBar()
  return <CommandBar open={open} onOpenChange={setOpen} />
}
