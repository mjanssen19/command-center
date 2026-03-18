// Paperclip API client — implemented in Phase 3
export async function paperclipFetch<T>(
  _path: string
): Promise<{ data: T | null; error: string | null; offline: boolean }> {
  return { data: null, error: null, offline: true }
}
