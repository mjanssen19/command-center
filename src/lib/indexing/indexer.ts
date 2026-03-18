import { scanWorkspace } from '../workspace/scanner'

let lastScanTime: string | null = null
let lastScanResult: { scanned: number; errors: string[] } = { scanned: 0, errors: [] }
let isRunning = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const RESCAN_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export function startIndexer(): void {
  const workspacePath = process.env.OPENCLAW_WORKSPACE_PATH

  if (!workspacePath) {
    console.log('[indexer] OPENCLAW_WORKSPACE_PATH not set — indexer disabled')
    return
  }

  console.log(`[indexer] Starting with workspace: ${workspacePath}`)

  // Initial scan (async, non-blocking)
  runScan()

  // Periodic re-scan
  setInterval(() => {
    runScan()
  }, RESCAN_INTERVAL_MS)

  // File watcher for incremental updates
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chokidar = require('chokidar')
    const watcher = chokidar.watch(workspacePath, {
      ignored: /(^|[/\\])\.|node_modules|\.git|\.next/,
      persistent: true,
      ignoreInitial: true,
      depth: 10,
    })

    const debouncedScan = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => runScan(), 2000)
    }

    watcher.on('change', debouncedScan)
    watcher.on('add', debouncedScan)

    console.log('[indexer] File watcher started')
  } catch {
    console.log('[indexer] File watcher not available — using interval scanning only')
  }
}

async function runScan() {
  if (isRunning) return
  isRunning = true

  try {
    lastScanResult = await scanWorkspace()
    lastScanTime = new Date().toISOString()
  } catch (err) {
    console.error('[indexer] Scan failed:', err)
  } finally {
    isRunning = false
  }
}

export function getIndexStatus() {
  return {
    lastScan: lastScanTime,
    ...lastScanResult,
    workspaceConfigured: !!process.env.OPENCLAW_WORKSPACE_PATH,
    isRunning,
  }
}
