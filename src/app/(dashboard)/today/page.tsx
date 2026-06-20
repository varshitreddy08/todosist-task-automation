'use client'
import { useState } from 'react'
import { format, isToday, isPast } from 'date-fns'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/useAppStore'
import { QuickAddTask } from '@/components/tasks/quick-add-task'
import { CheckCircle2, Circle, Plus, Clock, Flame, Brain, Sparkles } from 'lucide-react'
import type { Task, Priority } from '@/types'

const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  p1: { label: 'P1', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  p2: { label: 'P2', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  p3: { label: 'P3', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  p4: { label: 'P4', color: 'text-muted-foreground', bg: 'bg-muted' },
}

const mockTasks: Task[] = [
  { id: '1', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Morning review & plan', status: 'completed', priority: 'p2', due_date: format(new Date(), 'yyyy-MM-dd'), due_time: '08:00', is_recurring: true, recurrence_rule: 'FREQ=DAILY', assigned_to: null, created_by: 'u1', position: 0, estimated_minutes: 15, actual_minutes: 15, completed_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null },
  { id: '2', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Team standup', status: 'completed', priority: 'p2', due_date: format(new Date(), 'yyyy-MM-dd'), due_time: '10:00', is_recurring: true, recurrence_rule: 'FREQ=DAILY', assigned_to: null, created_by: 'u1', position: 1, estimated_minutes: 15, actual_minutes: 12, completed_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null },
  { id: '3', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Write project proposal', status: 'in_progress', priority: 'p1', due_date: format(new Date(), 'yyyy-MM-dd'), due_time: '17:00', is_recurring: false, recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 2, estimated_minutes: 90, actual_minutes: null, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null },
  { id: '4', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Review design mockups', status: 'todo', priority: 'p1', due_date: format(new Date(), 'yyyy-MM-dd'), due_time: '14:00', is_recurring: false, recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 3, estimated_minutes: 45, actual_minutes: null, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null },
  { id: '5', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Update task dependencies', status: 'todo', priority: 'p3', due_date: format(new Date(), 'yyyy-MM-dd'), due_time: null, is_recurring: false, recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 4, estimated_minutes: 30, actual_minutes: null, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null },
]

export default function TodayPage() {
  const [tasks, setTasks] = useState(mockTasks)
  const { setQuickAddOpen } = useAppStore()

  const done = tasks.filter(t => t.status === 'completed').length
  const total = tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  function toggleTask(id: string) {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' as const } : t
    ))
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Today</h1>
            <p className="text-muted-foreground text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-orange-500 font-medium bg-orange-50 dark:bg-orange-950/30 px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4" /> 12-day streak
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={pct} className="flex-1 h-2" />
          <span className="text-sm font-medium text-muted-foreground">{done}/{total}</span>
        </div>
        {pct === 100 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> All tasks completed! Excellent work today 🎉
          </motion.div>
        )}
      </div>

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
              onClick={() => toggleTask(task.id)}
            >
              <button className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleTask(task.id) }}>
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

      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI Suggestion</span>
        </div>
        <p className="text-sm text-muted-foreground">Start with the P1 task "Write project proposal" now while you're at peak energy. You have ~2 hours before your next scheduled task.</p>
      </div>

      <QuickAddTask />
    </div>
  )
}
