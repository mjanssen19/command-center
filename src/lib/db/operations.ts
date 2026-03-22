import { v4 as uuid } from 'uuid'
import { getDb } from './index'

// Generic insert helper
export function insertEntity(table: string, data: Record<string, unknown>) {
  const db = getDb()
  const id = (data.id as string) || uuid()
  const dataWithId: Record<string, unknown> = { ...data, id }
  const keys = Object.keys(dataWithId)
  const placeholders = keys.map(() => '?').join(', ')
  const values = keys.map((k) => {
    const v = dataWithId[k]
    return typeof v === 'object' ? JSON.stringify(v) : v
  })
  db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values)
  return id
}

// Parse JSON string fields that should be arrays/objects
function parseJsonFields(row: Record<string, unknown>): Record<string, unknown> {
  const result = { ...row }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        result[key] = JSON.parse(value)
      } catch {
        // leave as string if not valid JSON
      }
    }
  }
  return result
}

// Generic list helper
export function listEntities(table: string, limit = 100, offset = 0) {
  const db = getDb()
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY rowid DESC LIMIT ? OFFSET ?`).all(limit, offset)
  return rows.map((row) => parseJsonFields(row as Record<string, unknown>))
}

// Generic get by ID
export function getEntity(table: string, id: string) {
  const db = getDb()
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)
  return row ? parseJsonFields(row as Record<string, unknown>) : null
}

// Generic delete
export function deleteEntity(table: string, id: string) {
  const db = getDb()
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
}

// Search via FTS5
export function searchEntities(query: string, limit = 30) {
  const db = getDb()
  const ftsQuery = query
    .replace(/['"*()]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term}"*`)
    .join(' ')

  if (!ftsQuery) return []

  return db
    .prepare(
      `
    SELECT entity_type, entity_id, title,
           snippet(search_index, 3, '<mark>', '</mark>', '...', 30) as snippet
    FROM search_index
    WHERE search_index MATCH ?
    ORDER BY rank
    LIMIT ?
  `
    )
    .all(ftsQuery, limit)
}

// Add to search index
export function indexForSearch(
  entityType: string,
  entityId: string,
  title: string,
  body: string
) {
  const db = getDb()
  db.prepare(
    `INSERT INTO search_index (entity_type, entity_id, title, body) VALUES (?, ?, ?, ?)`
  ).run(entityType, entityId, title, body)
}
