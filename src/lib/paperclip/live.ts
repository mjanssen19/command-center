'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const WS_BASE = process.env.NEXT_PUBLIC_PAPERCLIP_WS_URL || 'ws://localhost:3100'

export function usePaperclipLive(companyId?: string) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!companyId) return

    function connect() {
      try {
        const ws = new WebSocket(`${WS_BASE}/api/companies/${companyId}/events/ws`)
        wsRef.current = ws

        ws.onmessage = (e) => {
          try {
            const event = JSON.parse(e.data)
            const type = event.type || ''

            if (type.startsWith('agent.')) {
              queryClient.invalidateQueries({ queryKey: ['paperclip', 'agents'] })
              queryClient.invalidateQueries({ queryKey: ['paperclip', 'agent'] })
            }
            if (type.startsWith('heartbeat.')) {
              queryClient.invalidateQueries({ queryKey: ['paperclip', 'runs'] })
              queryClient.invalidateQueries({ queryKey: ['paperclip', 'agents'] })
            }
            if (type.startsWith('activity.')) {
              queryClient.invalidateQueries({ queryKey: ['paperclip', 'activity'] })
            }
            // Also refresh dashboard on any event
            queryClient.invalidateQueries({ queryKey: ['paperclip', 'dashboard'] })
          } catch {
            // Ignore parse errors
          }
        }

        ws.onclose = () => {
          wsRef.current = null
          // Reconnect after 5s
          reconnectTimeoutRef.current = setTimeout(connect, 5000)
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch {
        // Connection failed, retry
        reconnectTimeoutRef.current = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on cleanup
        wsRef.current.close()
      }
    }
  }, [companyId, queryClient])
}
