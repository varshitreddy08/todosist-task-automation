'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, Loader2, CheckCircle2 } from 'lucide-react'
import type { Task } from '@/types'

const supabase = createClient()

const priorityConfig = {
  p1: { label: 'P1', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  p2: { label: 'P2', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  p3: { label: 'P3', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  p4: { label: 'P4', color: 'text-muted-foreground', bg: 'bg-muted' },
}

function groupByDate(tasks: Task[]) {
  const groups: Record<string, Task[]> = {}
  for (const task of tasks) {
    const key = task.due_date ?? 'No date'
    if (!groups[key]) groups[key] = []
    groups[key].push(task)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

function formatDate(dateStr: string) {
  if (dateStr === 'No date') return 'No date'
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function UpcomingPage() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'upcoming'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .gt('due_date', today)
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as Task[]
    },
  })

  const groups = groupByDate(tasks)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold">Upcoming</h1>
        <p className="text-muted-foreground text-sm mt-1">Tasks due in the future</p>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Calendar className="w-12 h-12" />
          <div className="text-center">
            <p className="font-medium text-foreground">All clear ahead</p>
            <p className="text-sm mt-1">No upcoming tasks scheduled</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, dateTasks], gi) => (
            <motion.div key={date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{formatDate(date)}</span>
                </div>
                <div className="flex-1 h-px bg-border" />
                <Badge variant="secondary" className="text-[10px]">{dateTasks.length}</Badge>
              </div>
              <Card className="overflow-hidden">
                {dateTasks.map((task, i) => {
                  const p = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.p4
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors border-b last:border-0"
                    >
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                      <span className="flex-1 text-sm">{task.title}</span>
                      {task.due_time && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />{task.due_time}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}>
                        {p.label}
                      </span>
                    </div>
                  )
                })}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
