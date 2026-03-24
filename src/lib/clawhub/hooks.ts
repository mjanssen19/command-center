'use client'

import { useQuery } from '@tanstack/react-query'
import type { ClawHubSkill, ClawHubSkillDetail, ClawHubSearchResult, ClawHubVersion } from './types'

async function fetchClawHub<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`/api/clawhub?${query}`)
  if (!res.ok) throw new Error(`ClawHub: ${res.status}`)
  return res.json()
}

async function fetchClawHubText(params: Record<string, string>): Promise<string> {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`/api/clawhub?${query}`)
  if (!res.ok) throw new Error(`ClawHub: ${res.status}`)
  return res.text()
}

export function useClawHubSkills(sort: string = 'trending', limit: number = 50, cursor?: string) {
  return useQuery({
    queryKey: ['clawhub', 'skills', sort, limit, cursor],
    queryFn: () => fetchClawHub<{ items: ClawHubSkill[]; nextCursor: string | null }>({
      action: 'list',
      sort,
      limit: String(limit),
      ...(cursor ? { cursor } : {}),
    }),
    staleTime: 5 * 60 * 1000,
  })
}

export function useClawHubSearch(query: string) {
  return useQuery({
    queryKey: ['clawhub', 'search', query],
    queryFn: () => fetchClawHub<{ results: ClawHubSearchResult[] }>({
      action: 'search',
      q: query,
    }),
    enabled: query.length > 0,
    staleTime: 60 * 1000,
  })
}

export function useClawHubSkill(slug: string | undefined) {
  return useQuery({
    queryKey: ['clawhub', 'detail', slug],
    queryFn: () => fetchClawHub<ClawHubSkillDetail>({
      action: 'detail',
      slug: slug!,
    }),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })
}

export function useClawHubVersions(slug: string | undefined) {
  return useQuery({
    queryKey: ['clawhub', 'versions', slug],
    queryFn: () => fetchClawHub<{ items: ClawHubVersion[]; nextCursor: string | null }>({
      action: 'versions',
      slug: slug!,
    }),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })
}

export function useClawHubFile(slug: string | undefined, path: string = 'SKILL.md') {
  return useQuery({
    queryKey: ['clawhub', 'file', slug, path],
    queryFn: () => fetchClawHubText({
      action: 'file',
      slug: slug!,
      path,
    }),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  })
}
