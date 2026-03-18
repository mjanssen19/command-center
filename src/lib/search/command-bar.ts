import type { SearchResult } from '@/app/api/search/route'

export type { SearchResult }

export async function search(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return []

  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []

  const data = await res.json()
  return data.results ?? []
}

export const TYPE_LABELS: Record<SearchResult['type'], string> = {
  task: 'Task',
  project: 'Project',
  agent: 'Agent',
  document: 'Document',
  memory: 'Memory',
  schedule: 'Schedule',
  approval: 'Approval',
  person: 'Person',
}

export const GROUP_ORDER: SearchResult['type'][] = [
  'task',
  'project',
  'agent',
  'document',
  'memory',
  'approval',
  'schedule',
  'person',
]

export function groupResults(
  results: SearchResult[]
): Map<SearchResult['type'], SearchResult[]> {
  const groups = new Map<SearchResult['type'], SearchResult[]>()
  for (const result of results) {
    const existing = groups.get(result.type)
    if (existing) {
      existing.push(result)
    } else {
      groups.set(result.type, [result])
    }
  }
  return groups
}
