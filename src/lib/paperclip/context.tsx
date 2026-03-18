'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { usePaperclipStatus, useCompanies } from './hooks'
import { usePaperclipLive } from './live'
import type { PaperclipCompany } from './types'

interface PaperclipContextValue {
  status: 'connected' | 'disconnected' | 'unknown'
  companyId: string | undefined
  company: PaperclipCompany | undefined
  companies: PaperclipCompany[]
  setCompanyId: (id: string) => void
}

const PaperclipContext = createContext<PaperclipContextValue>({
  status: 'unknown',
  companyId: undefined,
  company: undefined,
  companies: [],
  setCompanyId: () => {},
})

export function PaperclipProvider({ children }: { children: ReactNode }) {
  const status = usePaperclipStatus()
  const { data: companies } = useCompanies()
  const [selectedCompanyId, setCompanyId] = useState<string>()

  // Derive effective companyId: use explicit selection if set, otherwise auto-select first
  const companyId =
    selectedCompanyId ?? (companies && companies.length > 0 ? companies[0].id : undefined)

  const company = companies?.find((c) => c.id === companyId)

  // WebSocket connection for live updates
  usePaperclipLive(companyId)

  return (
    <PaperclipContext.Provider
      value={{
        status,
        companyId,
        company,
        companies: companies ?? [],
        setCompanyId,
      }}
    >
      {children}
    </PaperclipContext.Provider>
  )
}

export function usePaperclip() {
  return useContext(PaperclipContext)
}
