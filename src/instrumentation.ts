export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startIndexer } = await import('./lib/indexing/indexer')
      startIndexer()
    } catch (err) {
      console.error('[instrumentation] Failed to start indexer:', err)
    }
  }
}
