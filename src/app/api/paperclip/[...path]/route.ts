import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ offline: true }, { status: 503 })
}

export async function POST() {
  return NextResponse.json({ offline: true }, { status: 503 })
}

export async function PATCH() {
  return NextResponse.json({ offline: true }, { status: 503 })
}
