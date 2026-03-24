import fg from 'fast-glob'
import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import { discoverAgents } from './openclaw-config'

const EXTENSIONS = ['**/*.md', '**/*.json', '**/*.yaml', '**/*.yml', '**/*.txt', '**/*.csv']
const MAX_SUMMARY_LENGTH = 500

export async function scanWorkspace(): Promise<{ scanned: number; errors: string[] }> {
  const workspacePath = process.env.OPENCLAW_WORKSPACE_PATH
  if (!workspacePath) {
    console.log('[scanner] OPENCLAW_WORKSPACE_PATH not set — skipping scan')
    return { scanned: 0, errors: [] }
  }

  if (!fs.existsSync(workspacePath)) {
    console.log(`[scanner] Workspace path does not exist: ${workspacePath}`)
    return { scanned: 0, errors: [`Path does not exist: ${workspacePath}`] }
  }

  const errors: string[] = []
  let scanned = 0

  try {
    const files = await fg(EXTENSIONS, {
      cwd: workspacePath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
    })

    const db = getDb()

    const upsertDoc = db.prepare(`
      INSERT INTO documents (id, path, type, title, summary, tags, mtime, size, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(path) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        tags = excluded.tags,
        mtime = excluded.mtime,
        size = excluded.size,
        indexed_at = datetime('now')
    `)

    const upsertSearch = db.prepare(`
      INSERT INTO search_index (entity_type, entity_id, title, body)
      VALUES ('document', ?, ?, ?)
    `)

    // Clear old search entries for documents before re-indexing
    db.prepare(`DELETE FROM search_index WHERE entity_type = 'document'`).run()

    const transaction = db.transaction(() => {
      for (const filePath of files) {
        try {
          const stat = fs.statSync(filePath)
          const ext = path.extname(filePath).toLowerCase()
          const raw = fs.readFileSync(filePath, 'utf-8')

          let title = path.basename(filePath, ext)
          let summary = raw.slice(0, MAX_SUMMARY_LENGTH)
          let tags: string[] = []

          // Try to parse frontmatter for .md files
          if (ext === '.md') {
            try {
              const parsed = matter(raw)
              if (parsed.data.title) title = parsed.data.title
              if (parsed.data.tags)
                tags = Array.isArray(parsed.data.tags) ? parsed.data.tags : [parsed.data.tags]
              summary = parsed.content.slice(0, MAX_SUMMARY_LENGTH)
            } catch {
              // Not valid frontmatter, use raw content
            }
          }

          // Infer entity type from path
          const entityType = inferEntityType(filePath)

          // Generate stable ID from path
          const existingRow = db
            .prepare('SELECT id FROM documents WHERE path = ?')
            .get(filePath) as { id: string } | undefined
          const id = existingRow?.id || uuid()

          upsertDoc.run(
            id,
            filePath,
            ext.replace('.', ''),
            title,
            summary,
            JSON.stringify(tags),
            stat.mtime.toISOString(),
            stat.size
          )

          upsertSearch.run(id, title, summary)

          // If this looks like a memory file, also add to memories table
          if (entityType === 'memory') {
            indexAsMemory(db, filePath, raw, tags, stat)
          }

          scanned++
        } catch (err) {
          errors.push(
            `Error indexing ${filePath}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }
    })

    transaction()

    // Clean up documents whose files no longer exist
    const allDocs = db.prepare('SELECT id, path FROM documents').all() as Array<{
      id: string
      path: string
    }>
    const deleteDoc = db.prepare('DELETE FROM documents WHERE id = ?')
    for (const doc of allDocs) {
      if (!fs.existsSync(doc.path)) {
        deleteDoc.run(doc.id)
      }
    }
  } catch (err) {
    errors.push(`Scanner error: ${err instanceof Error ? err.message : String(err)}`)
  }

  console.log(`[scanner] Scanned ${scanned} files, ${errors.length} errors`)

  // Discover and sync agents from openclaw.json
  try {
    syncOpenClawAgents()
  } catch (err) {
    errors.push(
      `Agent discovery error: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  return { scanned, errors }
}

// --- Agent sync from openclaw-config ---

/** Sanitize an ID for safe use as a SQLite primary key */
function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/**
 * Discovers agents from openclaw.json and upserts them into the agents table.
 * Only overwrites agents where source='scanner' (never touches source='local').
 */
function syncOpenClawAgents(): void {
  const agents = discoverAgents()

  if (agents.length === 0) {
    return
  }

  const db = getDb()

  const upsertAgent = db.prepare(`
    INSERT INTO agents (id, name, role, model, provider, status, adapter_type, source, config_path, emoji, channels, last_heartbeat_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'scanner', ?, ?, ?, NULL, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      model = excluded.model,
      provider = excluded.provider,
      status = excluded.status,
      adapter_type = excluded.adapter_type,
      config_path = excluded.config_path,
      emoji = excluded.emoji,
      channels = excluded.channels
    WHERE source = 'scanner'
  `)

  let discovered = 0

  for (const agent of agents) {
    const id = `oc-${sanitizeId(agent.id)}`
    const role = agent.isDefault ? 'Primary Agent' : 'Agent'
    const model = agent.model ?? ''
    const provider = model.includes('/') ? model.split('/')[0] : ''
    const emoji = agent.emoji ?? ''
    const channels = JSON.stringify(agent.channels ?? [])

    upsertAgent.run(
      id,
      agent.name,
      role,
      model,
      provider,
      'active',
      'openclaw',
      agent.workspace ?? null,
      emoji,
      channels
    )
    discovered++
  }

  console.log(`[scanner] Discovered ${discovered} OpenClaw agents`)
}

// --- Helpers ---

function inferEntityType(filePath: string): string {
  const lower = filePath.toLowerCase()
  if (lower.includes('/memory/') || lower.includes('/journal/') || lower.includes('/memories/'))
    return 'memory'
  if (lower.includes('/schedule/') || lower.includes('/cron/')) return 'schedule'
  if (lower.includes('/agent/') || lower.includes('/agents/')) return 'agent'
  return 'document'
}

function indexAsMemory(
  db: import('better-sqlite3').Database,
  filePath: string,
  content: string,
  tags: string[],
  stat: fs.Stats
) {
  // Extract date from filename or mtime
  const dateMatch = path.basename(filePath).match(/(\d{4}-\d{2}-\d{2})/)
  const date = dateMatch ? dateMatch[1] : stat.mtime.toISOString().split('T')[0]

  db.prepare(
    `
    INSERT OR IGNORE INTO memories (id, date, type, source, content, tags, created_at)
    VALUES (?, ?, 'journal', 'local', ?, ?, datetime('now'))
  `
  ).run(filePath, date, content.slice(0, 2000), JSON.stringify(tags))
}
