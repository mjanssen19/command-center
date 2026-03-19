// Server-side module — runs in API routes, NOT client components
// Lightweight ICS parser — no external dependencies

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  location?: string
  description?: string
}

/**
 * Minimal ICS parser that extracts VEVENT blocks.
 * Handles CRLF line unfolding and common ICS fields.
 */
function parseICS(raw: string): CalendarEvent[] {
  // Unfold continuation lines (RFC 5545 section 3.1)
  const unfolded = raw.replace(/\r?\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  const events: CalendarEvent[] = []
  let inEvent = false
  let current: Partial<CalendarEvent> = {}
  let eventIndex = 0

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      current = {}
      continue
    }

    if (line === 'END:VEVENT' && inEvent) {
      inEvent = false
      if (current.start) {
        events.push({
          id: current.id || `ics-event-${eventIndex++}`,
          title: current.title || 'Untitled',
          start: current.start,
          end: current.end,
          location: current.location,
          description: current.description,
        })
      }
      continue
    }

    if (!inEvent) continue

    // Extract property name and value (handle params like DTSTART;VALUE=DATE:20240101)
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const propPart = line.slice(0, colonIdx)
    const value = line.slice(colonIdx + 1).trim()
    const propName = propPart.split(';')[0]

    switch (propName) {
      case 'UID':
        current.id = value
        break
      case 'SUMMARY':
        current.title = unescapeICS(value)
        break
      case 'DTSTART':
        current.start = parseICSDate(value)
        break
      case 'DTEND':
        current.end = parseICSDate(value)
        break
      case 'LOCATION':
        current.location = unescapeICS(value)
        break
      case 'DESCRIPTION':
        current.description = unescapeICS(value)
        break
    }
  }

  return events
}

function parseICSDate(value: string): string {
  // Formats: 20240315T120000Z, 20240315T120000, 20240315
  const cleaned = value.replace(/[^0-9TZ]/g, '')

  if (cleaned.length >= 15) {
    // Full datetime: 20240315T120000 or 20240315T120000Z
    const year = cleaned.slice(0, 4)
    const month = cleaned.slice(4, 6)
    const day = cleaned.slice(6, 8)
    const hour = cleaned.slice(9, 11)
    const min = cleaned.slice(11, 13)
    const sec = cleaned.slice(13, 15)
    const tz = cleaned.endsWith('Z') ? 'Z' : ''
    return `${year}-${month}-${day}T${hour}:${min}:${sec}${tz}`
  }

  if (cleaned.length >= 8) {
    // Date only: 20240315
    const year = cleaned.slice(0, 4)
    const month = cleaned.slice(4, 6)
    const day = cleaned.slice(6, 8)
    return `${year}-${month}-${day}T00:00:00`
  }

  return value
}

function unescapeICS(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const icsUrl = process.env.CALENDAR_ICS_URL
  if (!icsUrl) return []

  try {
    const res = await fetch(icsUrl, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const raw = await res.text()
    const events = parseICS(raw)
    return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  } catch {
    return []
  }
}

export function isCalendarConfigured(): boolean {
  return !!process.env.CALENDAR_ICS_URL
}
