'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

export function useLocalCreate<T extends Record<string, unknown>>(entity: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: T) => {
      const res = await fetch(`/api/local/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSnakeCase(data as Record<string, unknown>)),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<{ id: string }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local', entity] })
    },
  })
}

export function useLocalUpdate(entity: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/local/${entity}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSnakeCase(data)),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local', entity] })
    },
  })
}

export function useLocalDelete(entity: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/local/${entity}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local', entity] })
    },
  })
}
