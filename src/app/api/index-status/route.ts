import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    lastScan: null,
    documentCount: 0,
    memoryCount: 0,
    errors: [],
    workspaceConfigured: false,
  })
}
