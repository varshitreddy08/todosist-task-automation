'use client'
import { useState } from 'react'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/useAppStore'
import { ChevronLeft, ChevronRight, Plus, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskRow } from '@/components/tasks/task-row'
import type { Task } from '@/types'

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function sectionHeader(date: Date): string {
  const today = new Date()
  const tomorrow = addDays(today, 1)
  const d = format(date, 'd MMM')
  const wd = format(date, 'EEEE')
  if (isSameDay(date, today)) return `${d} · Today · ${wd}`
  if (isSameDay(date, tomorrow)) return `${d} · Tomorrow · ${wd}`
  return `${d} · ${wd}`
}

export default function UpcomingPage() {
  const { setQuickAddOpen } = useAppStore()
  const queryClient = useQueryClient()
  const today = new Date()
  const [weekOffset, setWeekOffset] = useState(0)

  const viewWeekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(viewWeekStart, i))

  // Fetch today + upcoming tasks
  const { data: todayTasks = [], isLoading: l1 } = useQuery<Task[]>({
    queryKey: ['tasks', 'today'],
    queryFn: () => fetch('/api/tasks?filter=today').then(r => r.ok ? r.json() : []),
  })
  const { data: upcomingTasks = [], isLoading: l2 } = useQuery<Task[]>({
    queryKey: ['tasks', 'upcoming'],
    queryFn: () => fetch('/api/tasks?filter=upcoming').then(r => r.ok ? r.json() : []),
  })

  const isLoading = l1 || l2

  const toggle = useMutation({
    mutationFn: async (task: Task) => {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed'
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  // Build date→tasks map (deduplicated)
  const allTasks = [...todayTasks, ...upcomingTasks]
  const byDate: Record<string, Task[]> = {}
  for (const t of allTasks) {
    if (!t.due_date) continue
    if (!byDate[t.due_date]) byDate[t.due_date] = []
    if (!byDate[t.due_date].find(x => x.id === t.id)) byDate[t.due_date].push(t)
  }

  // 30 day sections starting from today
  const sections = Array.from({ length: 30 }, (_, i) => addDays(today, i))

  const monthLabel = format(viewWeekStart, 'MMMM yyyy')

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-3">Upcoming</h1>

      {/* Month + week navigation */}
      <div className="flex items-center justify-between mb-3">
        <button className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors">
          {monthLabel}
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(v => v - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1 text-sm font-medium rounded-md hover:bg-muted transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset(v => v + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 border-b mb-6">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div key={day.toISOString()} className="flex flex-col items-center gap-1 pb-3">
              <span className={cn(
                'text-[11px] font-medium',
                isToday ? 'text-red-500' : 'text-muted-foreground'
              )}>{WEEK_LABELS[i]}</span>
              <div
                className={cn(
                  'min-w-[28px] px-1.5 py-0.5 rounded-md flex items-center justify-center text-sm font-semibold',
                  isToday
                    ? 'bg-red-500 text-white'
                    : 'text-foreground'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day sections */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-7">
          {sections.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayTasks = (byDate[dateStr] ?? []).filter(t => t.status !== 'completed')

            return (
              <div key={dateStr}>
                {/* Section header */}
                <div className="mb-2">
                  <h2 className="text-[13px] font-semibold text-foreground mb-1.5">
                    {sectionHeader(day)}
                  </h2>
                  <div className="h-px bg-border" />
                </div>

                {/* Tasks */}
                {dayTasks.map(task => (
                  <TaskRow key={task.id} task={task} onToggle={() => toggle.mutate(task)} />
                ))}

                {/* Add task */}
                <button
                  onClick={() => setQuickAddOpen(true)}
                  className="flex items-center gap-2 py-1.5 px-1 text-sm text-muted-foreground hover:text-red-500 transition-colors group"
                >
                  <Plus className="w-4 h-4 group-hover:text-red-500 transition-colors flex-shrink-0" />
                  Add task
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
