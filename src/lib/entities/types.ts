// Core entity types for Command Center

export type EntityType =
  | 'document'
  | 'memory'
  | 'schedule_job'
  | 'activity_event'
  | 'person'
  | 'content_item'
  | 'feedback_item'
  | 'radar_signal'
  // Paperclip entities (read-only, not stored in SQLite)
  | 'agent'
  | 'task'
  | 'project'
  | 'approval'
  | 'run'

// Local entities (stored in SQLite)

export interface Document {
  id: string
  path: string
  type: string
  title: string
  summary: string
  tags: string[]
  projectId?: string
  agentId?: string
  indexedAt: string
  mtime: string
}

export interface Memory {
  id: string
  date: string
  type: string
  source: string
  content: string
  tags: string[]
  projectId?: string
  agentId?: string
  createdAt: string
}

export interface ScheduleJob {
  id: string
  name: string
  cron: string
  nextRun: string | null
  lastRun: string | null
  status: 'active' | 'paused' | 'error'
  linkedProject?: string
  linkedAgent?: string
}

export interface ActivityEvent {
  id: string
  type: string
  entityType: EntityType
  entityId: string
  summary: string
  timestamp: string
  agentId?: string
}

export interface Person {
  id: string
  name: string
  role: string
  email?: string
  notes?: string
  createdAt: string
}

export interface ContentItem {
  id: string
  title: string
  type: string
  status: 'idea' | 'draft' | 'review' | 'scheduled' | 'published'
  channel?: string
  publishedAt?: string
  linkedAgent?: string
}

export interface FeedbackItem {
  id: string
  type: 'rejection' | 'review_note' | 'post_mortem' | 'rating' | 'critique'
  content: string
  entityRef?: string
  agentId?: string
  timestamp: string
}

export interface RadarSignal {
  id: string
  topic: string
  source: string
  summary: string
  priority: 'low' | 'medium' | 'high'
  detectedAt: string
}

export interface EntityLink {
  id: string
  fromType: EntityType
  fromId: string
  toType: EntityType
  toId: string
  relationship: string
  confidence: number
}

// Paperclip entity stubs (read-only, from Paperclip API)

export interface PaperclipAgent {
  id: string
  name: string
  role: string
  status: 'active' | 'idle' | 'error' | 'offline'
  model?: string
  provider?: string
  currentTaskId?: string
  lastHeartbeat?: string
  machine?: string
}

export interface PaperclipIssue {
  id: string
  title: string
  description?: string
  status: 'backlog' | 'in_progress' | 'review' | 'done' | 'blocked' | 'recurring'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  projectId?: string
  assigneeId?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export interface PaperclipProject {
  id: string
  name: string
  description?: string
  status: string
  ownerId?: string
  priority?: string
  createdAt: string
  updatedAt: string
}

export interface PaperclipApproval {
  id: string
  type: string
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
  requestorAgentId?: string
  entityRef?: string
  payload?: unknown
  createdAt: string
  updatedAt: string
}

export interface PaperclipRun {
  id: string
  agentId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  summary?: string
  logs?: string[]
}
