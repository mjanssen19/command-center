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

    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'medium',
      project_id TEXT,
      assignee_agent_id TEXT,
      due_date TEXT,
      labels TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'offline',
      adapter_type TEXT NOT NULL DEFAULT 'manual',
      source TEXT NOT NULL DEFAULT 'local',
      config_path TEXT,
      last_heartbeat_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      owner_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'pending',
      requestor_agent_id TEXT,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS council_proposals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      recommendation TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(path);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
    CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date);
    CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_entity_links_from ON entity_links(from_type, from_id);
    CREATE INDEX IF NOT EXISTS idx_entity_links_to ON entity_links(to_type, to_id);
    CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
    CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
    CREATE INDEX IF NOT EXISTS idx_council_proposals_status ON council_proposals(status);
  `)

  // Migration: add linked_task column to schedule_jobs if missing
  const scheduleColInfo = db.prepare("PRAGMA table_info(schedule_jobs)").all() as Array<{ name: string }>
  const hasLinkedTask = scheduleColInfo.some((c) => c.name === 'linked_task')
  if (!hasLinkedTask) {
    db.exec("ALTER TABLE schedule_jobs ADD COLUMN linked_task TEXT")
  }

  // Migration: add emoji column to agents if missing
  const agentColInfo = db.prepare("PRAGMA table_info(agents)").all() as Array<{ name: string }>
  const hasEmoji = agentColInfo.some((c) => c.name === 'emoji')
  if (!hasEmoji) {
    db.exec("ALTER TABLE agents ADD COLUMN emoji TEXT DEFAULT ''")
  }

  // Migration: add channels column to agents if missing
  const hasChannels = agentColInfo.some((c) => c.name === 'channels')
  if (!hasChannels) {
    db.exec("ALTER TABLE agents ADD COLUMN channels TEXT DEFAULT '[]'")
  }

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
