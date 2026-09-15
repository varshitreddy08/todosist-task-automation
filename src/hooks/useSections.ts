import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type Section = {
  id: string
  project_id: string | null
  name: string
  position: number
  is_collapsed: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export class SectionsApiError extends Error {
  code: string
  detail?: string
  status: number
  constructor(code: string, message: string, status: number, detail?: string) {
    super(message)
    this.code = code
    this.status = status
    this.detail = detail
  }
}

interface ApiErrorBody {
  error?: string
  message?: string
  detail?: string
}

async function parseError(res: Response): Promise<SectionsApiError> {
  const text = await res.text()
  let payload: ApiErrorBody | null = null
  try { payload = JSON.parse(text) as ApiErrorBody } catch { /* keep as text */ }
  if (payload && typeof payload === 'object') {
    return new SectionsApiError(
      payload.error ?? 'UNKNOWN',
      payload.message ?? payload.error ?? `HTTP ${res.status}`,
      res.status,
      payload.detail
    )
  }
  return new SectionsApiError('UNKNOWN', text || `HTTP ${res.status}`, res.status)
}

export function useSections(projectId: string | null | undefined) {
  const key = projectId ? `?projectId=${projectId}` : ''
  return useQuery<Section[]>({
    queryKey: ['sections', projectId ?? 'inbox'],
    queryFn: () => fetch(`/api/sections${key}`).then((r) => (r.ok ? r.json() : [])),
    refetchInterval: 15000,
    staleTime: 10000,
  })
}

export function useCreateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; project_id?: string | null; position?: number }) => {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw await parseError(res)
      return res.json()
    },
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ['sections', vars.project_id ?? 'inbox'] })
    },
  })
}

export function useRenameSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/sections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw await parseError(res)
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sections'] }) },
  })
}

export function useDeleteSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sections/${id}`, { method: 'DELETE' })
      if (!res.ok) throw await parseError(res)
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sections'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
