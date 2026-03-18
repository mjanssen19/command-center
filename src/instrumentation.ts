export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startIndexer } = await import('./lib/indexing/indexer')
    startIndexer()
  }
}
