import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Dynamic import to avoid loading native modules at build time
    const { getIndexStatus } = await import('../../../lib/indexing/indexer')
    const status = getIndexStatus()

    const { getDb } = await import('../../../lib/db')
    const db = getDb()
    const documentCount = (
      db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number }
    ).count
    const memoryCount = (
      db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number }
    ).count
    const scheduleCount = (
      db.prepare('SELECT COUNT(*) as count FROM schedule_jobs').get() as { count: number }
    ).count
    const peopleCount = (
      db.prepare('SELECT COUNT(*) as count FROM people').get() as { count: number }
    ).count

    return NextResponse.json({
      ...status,
      counts: {
        documents: documentCount,
        memories: memoryCount,
        schedules: scheduleCount,
        people: peopleCount,
      },
    })
  } catch (err) {
    return NextResponse.json({
      lastScan: null,
      scanned: 0,
      errors: [String(err)],
      workspaceConfigured: !!process.env.OPENCLAW_WORKSPACE_PATH,
      isRunning: false,
      counts: { documents: 0, memories: 0, schedules: 0, people: 0 },
    })
  }
}
