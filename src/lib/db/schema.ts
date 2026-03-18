import type Database from 'better-sqlite3'

export function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      project_id TEXT,
      agent_id TEXT,
      indexed_at TEXT NOT NULL,
      mtime TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'journal',
      source TEXT NOT NULL DEFAULT 'local',
      content TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      project_id TEXT,
      agent_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedule_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cron TEXT,
      next_run TEXT,
      last_run TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      linked_project TEXT,
      linked_agent TEXT,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      summary TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      agent_id TEXT
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      email TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'post',
      status TEXT NOT NULL DEFAULT 'idea',
      channel TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      published_at TEXT,
      linked_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'feedback',
      content TEXT NOT NULL DEFAULT '',
      entity_type TEXT,
      entity_id TEXT,
      agent_id TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS radar_signals (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium',
      detected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entity_links (
      id TEXT PRIMARY KEY,
      from_type TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_type TEXT NOT NULL,
      to_id TEXT NOT NULL,
      relationship TEXT NOT NULL DEFAULT 'related',
      confidence REAL NOT NULL DEFAULT 1.0
    );

    CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(path);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
    CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date);
    CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_entity_links_from ON entity_links(from_type, from_id);
    CREATE INDEX IF NOT EXISTS idx_entity_links_to ON entity_links(to_type, to_id);
  `)

  // FTS5 virtual table — separate exec because CREATE VIRTUAL TABLE
  // doesn't support IF NOT EXISTS in all SQLite builds the same way
  const ftsExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='search_index'")
    .get()

  if (!ftsExists) {
    db.exec(`
      CREATE VIRTUAL TABLE search_index USING fts5(
        entity_type,
        entity_id UNINDEXED,
        title,
        body,
        content=''
      )
    `)
  }
}
