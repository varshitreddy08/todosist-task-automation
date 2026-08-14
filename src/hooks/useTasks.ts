'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Task } from '@/types'

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useTasks(projectId?: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId ?? 'inbox'],
    queryFn: () => {
      const url = projectId ? `/api/tasks?projectId=${projectId}` : '/api/tasks'
      return apiFetch<Task[]>(url)
    },
  })
}

export function useTodayTasks() {
  return useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: () => apiFetch<Task[]>('/api/tasks?filter=today'),
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (task: Partial<Task>) =>
      apiFetch<Task>('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      }),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      if (task.project_id) {
        queryClient.invalidateQueries({ queryKey: ['projects', task.project_id] })
      }
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Task> & { id: string }) =>
      apiFetch<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      if (task.project_id) {
        queryClient.invalidateQueries({ queryKey: ['projects', task.project_id] })
      }
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
