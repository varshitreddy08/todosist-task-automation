'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types'

const supabase = createClient()

export function useTasks(projectId?: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId ?? 'inbox'],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*, assignee:users!assigned_to(*)')
        .order('position', { ascending: true })

      if (projectId) {
        query = query.eq('project_id', projectId)
      } else {
        query = query.is('project_id', null)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Task[]
    },
  })
}

export function useTodayTasks() {
  return useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .lte('due_date', today)
        .neq('status', 'completed')
        .order('priority', { ascending: true })
      if (error) throw error
      return (data ?? []) as Task[]
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...task, created_by: user.id })
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
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
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
