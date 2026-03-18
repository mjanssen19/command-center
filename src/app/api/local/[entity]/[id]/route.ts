import { NextResponse } from 'next/server'

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
]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity, id } = await params

  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })
  }

  try {
    const { getEntity } = await import('../../../../../lib/db/operations')
    const item = getEntity(entity, id)
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ item })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity, id } = await params

  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })
  }

  try {
    const { deleteEntity } = await import('../../../../../lib/db/operations')
    const result = deleteEntity(entity, id)
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ deleted: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
