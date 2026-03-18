'use client'

import { useQuery } from '@tanstack/react-query'

export function useLocalData<T>(entity: string) {
  return useQuery({
    queryKey: ['local', entity],
    queryFn: async () => {
      const res = await fetch(`/api/local/${entity}`)
      if (!res.ok) return []
      const json = await res.json()
      return (json.items ?? []) as T[]
    },
    retry: false,
    staleTime: 30000,
  })
}
