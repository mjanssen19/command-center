import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ENTITIES = [
  'documents',
  'memories',
  'people',
  'content_items',
  'feedback_items',
  'radar_signals',
  'schedule_jobs',
  'activity_events',
  'entity_links',
  'issues',
  'agents',
  'projects',
  'approvals',
  'council_proposals',
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params

  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })
  }

  try {
    const { listEntities } = await import('../../../../lib/db/operations')
    const limit = Number(request.nextUrl.searchParams.get('limit') || '100')
    const offset = Number(request.nextUrl.searchParams.get('offset') || '0')
    const items = listEntities(entity, limit, offset)
    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params

  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { insertEntity } = await import('../../../../lib/db/operations')
    const id = insertEntity(entity, body)
    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
