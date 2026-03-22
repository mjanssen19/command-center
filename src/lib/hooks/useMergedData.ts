'use client'

import { useMemo } from 'react'
import type { MergedItem, DataSource } from '@/lib/entities/types'

export function useMergedList<TLocal, TPaperclip>(
  localItems: TLocal[] | undefined,
  paperclipItems: TPaperclip[] | null | undefined,
  paperclipConnected: boolean
): {
  items: Array<MergedItem<TLocal> | MergedItem<TPaperclip>>
  localCount: number
  paperclipCount: number
} {
  return useMemo(() => {
    const local: MergedItem<TLocal>[] = (localItems ?? []).map((item) => ({
      data: item,
      source: 'local' as DataSource,
      readonly: false,
    }))
    const paperclip: MergedItem<TPaperclip>[] =
      paperclipConnected && paperclipItems
        ? paperclipItems.map((item) => ({
            data: item,
            source: 'paperclip' as DataSource,
            readonly: true,
          }))
        : []
    return {
      items: [...local, ...paperclip],
      localCount: local.length,
      paperclipCount: paperclip.length,
    }
  }, [localItems, paperclipItems, paperclipConnected])
}
