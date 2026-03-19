'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Globe,
  Loader2,
  Brain,
  Calendar,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MetricCard } from '@/components/cards/MetricCard'
import { SectionCard } from '@/components/cards/SectionCard'
import { usePaperclip } from '@/lib/paperclip'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import type { Document, Memory } from '@/lib/entities/types'

// ── Index Status Hook ──

function useIndexStatus() {
  return useQuery({
    queryKey: ['index-status'],
    queryFn: async () => {
      const res = await fetch('/api/index-status')
      if (!res.ok) return null
      return res.json() as Promise<{
        status: string
        documentCount?: number
        memoryCount?: number
        lastScanTime?: string
        errors?: string[]
      }>
    },
    retry: false,
    staleTime: 30000,
  })
}

// ── Status Indicator ──

function StatusIndicator({
  status,
  label,
}: {
  status: 'connected' | 'disconnected' | 'unknown' | 'configured' | 'not_configured'
  label: string
}) {
  const isGood = status === 'connected' || status === 'configured'
  const isBad = status === 'disconnected' || status === 'not_configured'

  return (
    <div className="flex items-center gap-2">
      {isGood ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : isBad ? (
        <XCircle className="w-4 h-4 text-red-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-amber-500" />
      )}
      <span className="text-xs text-zinc-300">{label}</span>
      <span
        className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded ml-auto',
          isGood && 'bg-green-900/50 text-green-300',
          isBad && 'bg-red-900/50 text-red-300',
          !isGood && !isBad && 'bg-amber-900/50 text-amber-300'
        )}
      >
        {status === 'connected'
          ? 'Connected'
          : status === 'configured'
            ? 'Configured'
            : status === 'disconnected'
              ? 'Disconnected'
              : status === 'not_configured'
                ? 'Not Configured'
                : 'Unknown'}
      </span>
    </div>
  )
}

// ── Integration Status Hook ──

interface IntegrationStatus {
  mem0: { configured: boolean }
  supermemory: { configured: boolean }
  calendar: { configured: boolean }
}

function useIntegrationStatus() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/integrations?type=status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: IntegrationStatus | null) => {
        if (!cancelled && data) setStatus(data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return status
}

// ── Integration Row ──

function IntegrationRow({
  icon: Icon,
  name,
  description,
  configured,
  envVar,
}: {
  icon: React.ComponentType<{ className?: string }>
  name: string
  description: string
  configured: boolean
  envVar: string
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          configured ? 'bg-green-900/30' : 'bg-zinc-800'
        )}
      >
        <Icon className={cn('w-4 h-4', configured ? 'text-green-400' : 'text-zinc-500')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-300">{name}</p>
        <p className="text-[10px] text-zinc-600">
          {configured ? description : (
            <>Set <code className="text-zinc-500 bg-zinc-800 px-1 rounded">{envVar}</code> to enable</>
          )}
        </p>
      </div>
      <span
        className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded',
          configured ? 'bg-green-900/50 text-green-300' : 'bg-zinc-800 text-zinc-500'
        )}
      >
        {configured ? 'Active' : 'Not configured'}
      </span>
    </div>
  )
}

// ── Main Page ──

export default function SystemPage() {
  const { status: paperclipStatus } = usePaperclip()
  const { data: indexStatus, refetch: refetchIndex } = useIndexStatus()
  const integrationStatus = useIntegrationStatus()
  const { data: docs } = useLocalData<Document>('documents')
  const { data: memories } = useLocalData<Memory>('memories')
  const [isRescanning, setIsRescanning] = useState(false)

  const documentCount = docs?.length ?? indexStatus?.documentCount ?? 0
  const memoryCount = memories?.length ?? indexStatus?.memoryCount ?? 0
  const lastScanTime = indexStatus?.lastScanTime
  const errorCount = indexStatus?.errors?.length ?? 0

  const handleRescan = async () => {
    setIsRescanning(true)
    try {
      await fetch('/api/index-status', { method: 'POST' })
      await refetchIndex()
    } catch {
      // silently fail
    } finally {
      setIsRescanning(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="System"
        description="Health dashboard, integration status, and environment info."
        actions={
          <Button
            onClick={handleRescan}
            disabled={isRescanning}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs h-8 border border-zinc-700"
          >
            {isRescanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
            )}
            Re-scan Now
          </Button>
        }
      />

      {/* Health Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Paperclip"
          value={paperclipStatus === 'connected' ? 'Online' : 'Offline'}
          trend={paperclipStatus === 'connected' ? 'up' : 'down'}
        />
        <MetricCard label="Documents" value={documentCount} />
        <MetricCard label="Memories" value={memoryCount} />
        <MetricCard
          label="Errors"
          value={errorCount}
          trend={errorCount > 0 ? 'down' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Connection Status */}
        <SectionCard title="Connection Status">
          <div className="space-y-3">
            <StatusIndicator
              status={paperclipStatus === 'connected' ? 'connected' : 'disconnected'}
              label="Paperclip Agent Runtime"
            />
            <StatusIndicator
              status={
                indexStatus?.status === 'ready' || (docs && docs.length > 0)
                  ? 'connected'
                  : 'unknown'
              }
              label="SQLite Index"
            />
            {lastScanTime && (
              <div className="flex items-center gap-2 pl-6">
                <span className="text-[10px] text-zinc-600">
                  Last scan: {new Date(lastScanTime).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Integrations */}
        <SectionCard title="Integrations">
          <div className="space-y-1">
            <IntegrationRow
              icon={Brain}
              name="Mem0"
              description="Long-term memory provider"
              configured={integrationStatus?.mem0?.configured ?? false}
              envVar="MEM0_API_KEY"
            />
            <IntegrationRow
              icon={Globe}
              name="Supermemory"
              description="Web content memory"
              configured={integrationStatus?.supermemory?.configured ?? false}
              envVar="SUPERMEMORY_API_KEY"
            />
            <IntegrationRow
              icon={Calendar}
              name="External Calendar"
              description="Calendar sync (Google/Apple)"
              configured={integrationStatus?.calendar?.configured ?? false}
              envVar="CALENDAR_ICS_URL"
            />
          </div>
        </SectionCard>

        {/* Environment */}
        <SectionCard title="Environment">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Runtime</span>
              <span className="text-xs text-zinc-300">Next.js (App Router)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Database</span>
              <span className="text-xs text-zinc-300">SQLite (better-sqlite3)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Agent Runtime</span>
              <span className="text-xs text-zinc-300">
                Paperclip {paperclipStatus === 'connected' ? '(active)' : '(offline)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Platform</span>
              <span className="text-xs text-zinc-300">Node.js 20+</span>
            </div>
          </div>
        </SectionCard>

        {/* Error Log */}
        <SectionCard title="Error Log">
          {errorCount === 0 ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-xs text-zinc-500">No recent errors</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {(indexStatus?.errors ?? []).slice(0, 20).map((err, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-zinc-400 leading-snug">{err}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
