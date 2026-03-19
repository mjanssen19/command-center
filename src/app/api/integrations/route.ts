import { NextResponse } from 'next/server'
import { isMem0Configured, fetchMem0Memories } from '@/lib/integrations/mem0'
import { isSupermemoryConfigured, fetchSupermemoryItems } from '@/lib/integrations/supermemory'
import { isCalendarConfigured, fetchCalendarEvents } from '@/lib/integrations/calendar'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')

  if (type === 'status') {
    return NextResponse.json({
      mem0: { configured: isMem0Configured() },
      supermemory: { configured: isSupermemoryConfigured() },
      calendar: { configured: isCalendarConfigured() },
    })
  }

  if (type === 'mem0') {
    const memories = await fetchMem0Memories()
    return NextResponse.json(memories)
  }

  if (type === 'supermemory') {
    const items = await fetchSupermemoryItems()
    return NextResponse.json(items)
  }

  if (type === 'calendar') {
    const events = await fetchCalendarEvents()
    return NextResponse.json(events)
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
