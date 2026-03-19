// Server-side module — runs in API routes, NOT client components

export interface Mem0Memory {
  id: string
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export async function fetchMem0Memories(): Promise<Mem0Memory[]> {
  const apiKey = process.env.MEM0_API_KEY
  if (!apiKey) return []

  try {
    const res = await fetch('https://api.mem0.ai/v1/memories/', {
      headers: { Authorization: `Token ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.results ?? data ?? []
  } catch {
    return []
  }
}

export function isMem0Configured(): boolean {
  return !!process.env.MEM0_API_KEY
}
