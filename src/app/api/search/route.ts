import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const { getDb } = await import('../../../lib/db')
    const db = getDb()

    // Escape FTS5 special characters and add prefix matching
    const ftsQuery = query
      .replace(/['"*()]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term}"*`)
      .join(' ')

    const results = db
      .prepare(
        `
      SELECT entity_type, entity_id, title,
             snippet(search_index, 3, '<mark>', '</mark>', '...', 30) as snippet
      FROM search_index
      WHERE search_index MATCH ?
      ORDER BY rank
      LIMIT 30
    `
      )
      .all(ftsQuery)

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[search] Error:', err)
    return NextResponse.json({ results: [], error: String(err) })
  }
}
