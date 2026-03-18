const BASE_URL = process.env.PAPERCLIP_API_URL || 'http://localhost:3100'
const API_KEY = process.env.PAPERCLIP_API_KEY || ''

export interface PaperclipResponse<T> {
  data: T | null
  error: string | null
  offline: boolean
}

export async function paperclipFetch<T>(
  path: string,
  options?: RequestInit
): Promise<PaperclipResponse<T>> {
  if (!API_KEY) {
    return { data: null, error: 'PAPERCLIP_API_KEY not configured', offline: true }
  }

  try {
    const url = `${BASE_URL}${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        ...options?.headers,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      return { data: null, error: `${res.status}: ${text}`, offline: false }
    }

    const data = await res.json()
    return { data, error: null, offline: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isTimeout = message.includes('abort') || message.includes('timeout')
    return {
      data: null,
      error: message,
      offline:
        isTimeout || message.includes('ECONNREFUSED') || message.includes('fetch failed'),
    }
  }
}
