// Server-side module — runs in API routes, NOT client components

export interface SupermemoryItem {
  id: string
  content: string
  source?: string
  created_at: string
}

export async function fetchSupermemoryItems(): Promise<SupermemoryItem[]> {
  const apiKey = process.env.SUPERMEMORY_API_KEY
  if (!apiKey) return []

  try {
    const res = await fetch('https://api.supermemory.ai/v1/memories', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.results ?? data ?? []
  } catch {
    return []
  }
}

export function isSupermemoryConfigured(): boolean {
  return !!process.env.SUPERMEMORY_API_KEY
}
