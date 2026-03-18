'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  PaperclipCompany,
  PaperclipAgent,
  PaperclipIssue,
  PaperclipProject,
  PaperclipApproval,
  PaperclipRun,
  PaperclipCostSummary,
  PaperclipActivity,
  PaperclipOrgNode,
} from './types'

// Helper to fetch from proxy
async function fetchPaperclip<T>(path: string): Promise<T | null> {
  const res = await fetch(`/api/paperclip${path}`)
  if (res.status === 503) return null // offline
  if (!res.ok) throw new Error(`Paperclip: ${res.status}`)
  return res.json()
}

async function mutatePaperclip<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/paperclip${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(err)
  }
  return res.json()
}

// Status hook
export function usePaperclipStatus() {
  const query = useQuery({
    queryKey: ['paperclip', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/paperclip/health')
      if (res.status === 503) return 'disconnected' as const
      if (!res.ok) return 'disconnected' as const
      return 'connected' as const
    },
    refetchInterval: 10000,
    retry: false,
  })
  return query.data ?? ('unknown' as const)
}

// Companies
export function useCompanies() {
  return useQuery({
    queryKey: ['paperclip', 'companies'],
    queryFn: () => fetchPaperclip<PaperclipCompany[]>('/companies'),
    retry: false,
    staleTime: 60000,
  })
}

// Agents (company-scoped)
export function useAgents(companyId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'agents', companyId],
    queryFn: () => fetchPaperclip<PaperclipAgent[]>(`/companies/${companyId}/agents`),
    enabled: !!companyId,
    retry: false,
    staleTime: 30000,
  })
}

// Single agent
export function useAgent(companyId?: string, agentId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'agent', companyId, agentId],
    queryFn: () => fetchPaperclip<PaperclipAgent>(`/companies/${companyId}/agents/${agentId}`),
    enabled: !!companyId && !!agentId,
    retry: false,
    staleTime: 15000,
  })
}

// Agent runs
export function useAgentRuns(companyId?: string, agentId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'runs', companyId, agentId],
    queryFn: () =>
      fetchPaperclip<PaperclipRun[]>(`/companies/${companyId}/agents/${agentId}/runs`),
    enabled: !!companyId && !!agentId,
    retry: false,
  })
}

// Issues (company-scoped)
export function useIssues(companyId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'issues', companyId],
    queryFn: () => fetchPaperclip<PaperclipIssue[]>(`/companies/${companyId}/issues`),
    enabled: !!companyId,
    retry: false,
    staleTime: 15000,
  })
}

// Single issue
export function useIssue(companyId?: string, issueId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'issue', companyId, issueId],
    queryFn: () => fetchPaperclip<PaperclipIssue>(`/companies/${companyId}/issues/${issueId}`),
    enabled: !!companyId && !!issueId,
    retry: false,
  })
}

// Issue comments
export function useIssueComments(companyId?: string, issueId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'comments', companyId, issueId],
    queryFn: () =>
      fetchPaperclip<unknown[]>(`/companies/${companyId}/issues/${issueId}/comments`),
    enabled: !!companyId && !!issueId,
    retry: false,
  })
}

// Projects
export function useProjects(companyId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'projects', companyId],
    queryFn: () => fetchPaperclip<PaperclipProject[]>(`/companies/${companyId}/projects`),
    enabled: !!companyId,
    retry: false,
    staleTime: 30000,
  })
}

// Org chart
export function useOrgChart(companyId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'org', companyId],
    queryFn: () => fetchPaperclip<PaperclipOrgNode[]>(`/companies/${companyId}/org`),
    enabled: !!companyId,
    retry: false,
    staleTime: 60000,
  })
}

// Approvals
export function useApprovals(companyId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'approvals', companyId],
    queryFn: () => fetchPaperclip<PaperclipApproval[]>(`/companies/${companyId}/approvals`),
    enabled: !!companyId,
    retry: false,
    staleTime: 15000,
  })
}

// Costs
export function useCosts(companyId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'costs', companyId],
    queryFn: () => fetchPaperclip<PaperclipCostSummary>(`/companies/${companyId}/costs/summary`),
    enabled: !!companyId,
    retry: false,
    staleTime: 60000,
  })
}

// Activity feed
export function useActivity(companyId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'activity', companyId],
    queryFn: () => fetchPaperclip<PaperclipActivity[]>(`/companies/${companyId}/activity`),
    enabled: !!companyId,
    retry: false,
    staleTime: 15000,
  })
}

// Dashboard data
export function useDashboard(companyId?: string) {
  return useQuery({
    queryKey: ['paperclip', 'dashboard', companyId],
    queryFn: () => fetchPaperclip<unknown>(`/companies/${companyId}/dashboard`),
    enabled: !!companyId,
    retry: false,
    staleTime: 30000,
  })
}

// Mutations

export function useCreateIssue(companyId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      title: string
      description?: string
      status?: string
      priority?: string
      assigneeId?: string
      projectId?: string
    }) => mutatePaperclip<PaperclipIssue>(`/companies/${companyId}/issues`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paperclip', 'issues', companyId] })
    },
  })
}

export function useUpdateIssue(companyId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      issueId,
      ...data
    }: {
      issueId: string
      status?: string
      title?: string
      priority?: string
      assigneeId?: string
    }) => mutatePaperclip<PaperclipIssue>(`/companies/${companyId}/issues/${issueId}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paperclip', 'issues', companyId] })
    },
  })
}

export function useApproveApproval(companyId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (approvalId: string) =>
      mutatePaperclip<PaperclipApproval>(
        `/companies/${companyId}/approvals/${approvalId}/approve`,
        'PATCH'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paperclip', 'approvals', companyId] })
    },
  })
}

export function useRejectApproval(companyId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (approvalId: string) =>
      mutatePaperclip<PaperclipApproval>(
        `/companies/${companyId}/approvals/${approvalId}/reject`,
        'PATCH'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paperclip', 'approvals', companyId] })
    },
  })
}
