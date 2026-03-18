import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.PAPERCLIP_API_URL || 'http://localhost:3100'
const API_KEY = process.env.PAPERCLIP_API_KEY || ''

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const path = '/' + params.path.join('/')
  const url = `${BASE_URL}/api${path}`

  if (!API_KEY) {
    return NextResponse.json(
      { error: 'PAPERCLIP_API_KEY not configured', offline: true },
      { status: 503 }
    )
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${API_KEY}`,
    }

    // Forward content-type for POST/PATCH/PUT
    const contentType = request.headers.get('content-type')
    if (contentType) {
      headers['Content-Type'] = contentType
    }

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(10000),
    }

    // Forward body for non-GET requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fetchOptions.body = await request.text()
    }

    // Forward query params
    const searchParams = request.nextUrl.searchParams.toString()
    const fullUrl = searchParams ? `${url}?${searchParams}` : url

    const res = await fetch(fullUrl, fetchOptions)

    const responseBody = await res.text()

    return new NextResponse(responseBody, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message, offline: true }, { status: 503 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolved = await params
  return proxyRequest(request, resolved)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolved = await params
  return proxyRequest(request, resolved)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolved = await params
  return proxyRequest(request, resolved)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolved = await params
  return proxyRequest(request, resolved)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolved = await params
  return proxyRequest(request, resolved)
}
