import { NextRequest, NextResponse } from 'next/server'

const CLAWHUB_BASE = 'https://clawhub.ai/api/v1'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')

  if (!action) {
    return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 })
  }

  let url: string
  const params = request.nextUrl.searchParams

  switch (action) {
    case 'search': {
      const q = params.get('q') || ''
      url = `${CLAWHUB_BASE}/search?q=${encodeURIComponent(q)}`
      break
    }
    case 'list': {
      const sort = params.get('sort') || 'trending'
      const limit = params.get('limit') || '50'
      const cursor = params.get('cursor') || ''
      url = `${CLAWHUB_BASE}/skills?sort=${sort}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`
      break
    }
    case 'detail': {
      const slug = params.get('slug')
      if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
      url = `${CLAWHUB_BASE}/skills/${encodeURIComponent(slug)}`
      break
    }
    case 'versions': {
      const slug = params.get('slug')
      if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
      url = `${CLAWHUB_BASE}/skills/${encodeURIComponent(slug)}/versions`
      break
    }
    case 'file': {
      const slug = params.get('slug')
      const path = params.get('path')
      if (!slug || !path) return NextResponse.json({ error: 'Missing slug or path' }, { status: 400 })
      url = `${CLAWHUB_BASE}/skills/${encodeURIComponent(slug)}/file?path=${encodeURIComponent(path)}`
      break
    }
    case 'moderation': {
      const slug = params.get('slug')
      if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
      url = `${CLAWHUB_BASE}/skills/${encodeURIComponent(slug)}/moderation`
      break
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' },
    })

    const contentType = res.headers.get('content-type') || ''

    if (action === 'file' && !contentType.includes('json')) {
      const text = await res.text()
      return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
