'use client'
import { useEffect, useState } from 'react'
import { format, addDays } from 'date-fns'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/useAppStore'
import { CheckCircle2, Circle, Plus, Clock, Flame, Brain, Sparkles, Loader2 } from 'lucide-react'
import type { Task, Priority } from '@/types'

const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  p1: { label: 'P1', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  p2: { label: 'P2', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  p3: { label: 'P3', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  p4: { label: 'P4', color: 'text-muted-foreground', bg: 'bg-muted' },
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function TodayPage() {
  const { setQuickAddOpen } = useAppStore()
  const queryClient = useQueryClient()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: () => apiFetch<Task[]>('/api/tasks?filter=today'),
    refetchInterval: 30000,
  })

  const { data: streak = 0 } = useQuery({
    queryKey: ['streak'],
    queryFn: async () => {
      const data = await apiFetch<{ completed_at: string | null }[]>('/api/tasks?filter=streak')
      if (!data.length) return 0
      const doneDates = new Set(data.filter(t => t.completed_at).map(t => (t.completed_at as string).split('T')[0]))
      let count = 0
      let check = new Date()
      if (!doneDates.has(format(check, 'yyyy-MM-dd'))) check = addDays(check, -1)
      while (doneDates.has(format(check, 'yyyy-MM-dd'))) { count++; check = addDays(check, -1) }
      return count
    },
    refetchInterval: 60000,
  })

  const { data: aiSuggestion } = useQuery({
    queryKey: ['ai-suggestion', todayStr],
    queryFn: () => apiFetch<{ suggestion: string }>(`/api/ai/today-suggestion`),
    staleTime: 1000 * 60 * 60,
    retry: false,
  })

  const toggleTask = useMutation({
    mutationFn: async (task: Task) => {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed'
      return apiFetch<Task>(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['streak'] })
    },
  })

  const done = tasks.filter(t => t.status === 'completed').length
  const total = tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const urgentPending = tasks.filter(t => t.status !== 'completed' && t.priority === 'p1')

  const defaultSuggestion = urgentPending.length > 0
    ? `Start with "${urgentPending[0].title}" — it's your highest priority task for today.`
    : tasks.length === 0
      ? "No tasks yet for today. Add something to get started!"
      : "Great job! You're making good progress on today's tasks."

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Today</h1>
            <p className="text-muted-foreground text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-orange-500 font-medium bg-orange-50 dark:bg-orange-950/30 px-3 py-1.5 rounded-full">
                <Flame className="w-4 h-4" /> {streak}-day streak
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={pct} className="flex-1 h-2" />
          <span className="text-sm font-medium text-muted-foreground">{done}/{total}</span>
        </div>
        {pct === 100 && total > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> All tasks completed! Excellent work today 🎉
          </motion.div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task, i) => {
            const p = priorityConfig[task.priority]
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-all group cursor-pointer ${task.status === 'completed' ? 'opacity-60' : ''}`}
                onClick={() => toggleTask.mutate(task)}
              >
                <button className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleTask.mutate(task) }}>
                  {task.status === 'completed'
                    ? <CheckCircle2 className="w-6 h-6 text-primary" />
                    : <Circle className="w-6 h-6 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  }
                </button>
                <div className="flex-1">
                  <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {task.due_time && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{task.due_time}</span>}
                    {task.estimated_minutes && <span className="text-xs text-muted-foreground">~{task.estimated_minutes}m</span>}
                    {task.is_recurring && <span className="text-xs text-muted-foreground">↻ Daily</span>}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.bg} ${p.color}`}>{p.label}</span>
              </motion.div>
            )
          })}
          <button onClick={() => setQuickAddOpen(true)} className="w-full flex items-center gap-2 p-4 rounded-xl border-dashed border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-primary">
            <Plus className="w-4 h-4" /> Add a task for today
          </button>
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI Suggestion</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {aiSuggestion?.suggestion ?? defaultSuggestion}
        </p>
      </div>

    </div>
  )
}
