import { NextRequest, NextResponse } from 'next/server'
import { paperclipFetch } from '@/lib/paperclip/client'
import type {
  PaperclipIssue,
  PaperclipAgent,
  PaperclipProject,
  PaperclipApproval,
} from '@/lib/paperclip/types'

export interface SearchResult {
  id: string
  type: 'task' | 'project' | 'agent' | 'document' | 'memory' | 'schedule' | 'approval' | 'person'
  title: string
  subtitle?: string
  url: string
}

function entityTypeToSearchType(
  entityType: string
): SearchResult['type'] | null {
  switch (entityType) {
    case 'document':
    case 'documents':
      return 'document'
    case 'memory':
    case 'memories':
      return 'memory'
    case 'schedule_job':
    case 'schedule_jobs':
      return 'schedule'
    case 'person':
    case 'people':
      return 'person'
    case 'content_item':
    case 'content_items':
      return 'document'
    case 'feedback_item':
    case 'feedback_items':
      return 'document'
    default:
      return null
  }
}

function entityTypeToUrl(type: SearchResult['type']): string {
  switch (type) {
    case 'task':
      return '/tasks'
    case 'project':
      return '/projects'
    case 'agent':
      return '/agents'
    case 'document':
      return '/docs'
    case 'memory':
      return '/memory'
    case 'schedule':
      return '/calendar'
    case 'approval':
      return `/approvals`
    case 'person':
      return '/people'
    default:
      return '/'
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const results: SearchResult[] = []

  // 1. Query local SQLite FTS5
  try {
    const { getDb } = await import('../../../lib/db')
    const db = getDb()

    const ftsQuery = query
      .replace(/['"*()]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term}"*`)
      .join(' ')

    if (ftsQuery) {
      const rows = db
        .prepare(
          `
          SELECT entity_type, entity_id, title,
                 snippet(search_index, 3, '', '', '...', 30) as snippet
          FROM search_index
          WHERE search_index MATCH ?
          ORDER BY rank
          LIMIT 15
          `
        )
        .all(ftsQuery) as Array<{
        entity_type: string
        entity_id: string
        title: string
        snippet: string
      }>

      for (const row of rows) {
        const type = entityTypeToSearchType(row.entity_type)
        if (type) {
          results.push({
            id: row.entity_id,
            type,
            title: row.title || row.snippet?.slice(0, 60) || row.entity_type,
            subtitle: row.snippet || undefined,
            url: entityTypeToUrl(type),
          })
        }
      }
    }
  } catch (err) {
    console.error('[search] SQLite error:', err)
  }

  // 2. Query Paperclip for issues, agents, projects, approvals
  try {
    // Get first company ID from Paperclip
    const companiesRes = await paperclipFetch<Array<{ id: string }>>('/api/companies')
    const companyId = companiesRes.data?.[0]?.id

    if (companyId) {
      const lowerQuery = query.toLowerCase()

      // Fetch in parallel
      const [issuesRes, agentsRes, projectsRes, approvalsRes] = await Promise.all([
        paperclipFetch<PaperclipIssue[]>(`/api/companies/${companyId}/issues`),
        paperclipFetch<PaperclipAgent[]>(`/api/companies/${companyId}/agents`),
        paperclipFetch<PaperclipProject[]>(`/api/companies/${companyId}/projects`),
        paperclipFetch<PaperclipApproval[]>(`/api/companies/${companyId}/approvals`),
      ])

      // Filter issues
      if (issuesRes.data) {
        for (const issue of issuesRes.data) {
          if (
            issue.title.toLowerCase().includes(lowerQuery) ||
            issue.description?.toLowerCase().includes(lowerQuery)
          ) {
            results.push({
              id: issue.id,
              type: 'task',
              title: issue.title,
              subtitle: issue.status + (issue.priority ? ` / ${issue.priority}` : ''),
              url: '/tasks',
            })
          }
        }
      }

      // Filter agents
      if (agentsRes.data) {
        for (const agent of agentsRes.data) {
          if (
            agent.name.toLowerCase().includes(lowerQuery) ||
            agent.role.toLowerCase().includes(lowerQuery)
          ) {
            results.push({
              id: agent.id,
              type: 'agent',
              title: agent.name,
              subtitle: agent.role,
              url: '/agents',
            })
          }
        }
      }

      // Filter projects
      if (projectsRes.data) {
        for (const project of projectsRes.data) {
          if (
            project.name.toLowerCase().includes(lowerQuery) ||
            project.description?.toLowerCase().includes(lowerQuery)
          ) {
            results.push({
              id: project.id,
              type: 'project',
              title: project.name,
              subtitle: project.description?.slice(0, 80) || project.status,
              url: '/projects',
            })
          }
        }
      }

      // Filter approvals
      if (approvalsRes.data) {
        for (const approval of approvalsRes.data) {
          if (
            approval.type.toLowerCase().includes(lowerQuery) ||
            approval.status.toLowerCase().includes(lowerQuery)
          ) {
            results.push({
              id: approval.id,
              type: 'approval',
              title: `${approval.type} approval`,
              subtitle: approval.status,
              url: '/approvals',
            })
          }
        }
      }
    }
  } catch (err) {
    // Paperclip may be offline — that's fine, we still return local results
    console.error('[search] Paperclip error:', err)
  }

  // Limit to 30 results total
  return NextResponse.json({ results: results.slice(0, 30) })
}
