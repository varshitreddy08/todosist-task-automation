'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { useAppStore } from '@/store/useAppStore'
import { QuickAddTask } from '@/components/tasks/quick-add-task'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, Clock, Loader2 } from 'lucide-react'

type CalendarTask = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  due_time: string | null
}

const priorityColor: Record<string, string> = {
  p1: 'bg-red-500',
  p2: 'bg-orange-400',
  p3: 'bg-blue-400',
  p4: 'bg-gray-400',
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function CalendarPage() {
  const [selected, setSelected] = useState<Date>(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const { setQuickAddOpen } = useAppStore()

  const month = format(selected, 'yyyy-MM')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'calendar', month],
    queryFn: () => apiFetch<CalendarTask[]>(`/api/tasks?filter=calendar&month=${month}`),
    refetchInterval: 30000,
  })

  const tasksByDate: Record<string, CalendarTask[]> = {}
  for (const task of tasks) {
    if (!task.due_date) continue
    tasksByDate[task.due_date] ??= []
    tasksByDate[task.due_date].push(task)
  }

  const selectedKey = format(selected, 'yyyy-MM-dd')
  const dayTasks = tasksByDate[selectedKey] ?? []
  const today = format(new Date(), 'yyyy-MM-dd')

  const upcoming = Object.entries(tasksByDate)
    .filter(([date]) => date >= today)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 5)
    .flatMap(([date, dateTasks]) => dateTasks.map(t => ({ ...t, date })))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">Visualize your tasks and schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden text-sm">
            {(['month', 'week', 'day'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 capitalize transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>{v}</button>
            ))}
          </div>
          <Button className="gradient-primary text-white border-0 gap-2" onClick={() => setQuickAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(d) => d && setSelected(d)}
                onMonthChange={(d) => setSelected(d)}
                className="w-full"
                modifiers={{ hasTasks: (date) => !!tasksByDate[format(date, 'yyyy-MM-dd')]?.length }}
                modifiersClassNames={{ hasTasks: 'font-bold underline decoration-primary decoration-2' }}
              />
            )}
          </Card>
        </div>

        <div>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{format(selected, 'EEEE')}</h3>
                <p className="text-sm text-muted-foreground">{format(selected, 'MMMM d, yyyy')}</p>
              </div>
              <button onClick={() => setQuickAddOpen(true)} className="text-muted-foreground hover:text-primary transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {dayTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-sm text-muted-foreground">No tasks scheduled</p>
                <button onClick={() => setQuickAddOpen(true)} className="mt-3 text-sm text-primary hover:underline">Add a task</button>
              </div>
            ) : (
              <div className="space-y-2">
                {dayTasks
                  .sort((a, b) => (a.due_time ?? '').localeCompare(b.due_time ?? ''))
                  .map((task) => (
                    <div key={task.id} className={`flex items-start gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer ${task.status === 'completed' ? 'opacity-50' : ''}`}>
                      <div className={`w-1 min-h-8 rounded-full flex-shrink-0 ${priorityColor[task.priority] ?? 'bg-gray-400'}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                        {task.due_time && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />{task.due_time}
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${task.priority === 'p1' ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400'}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          <Card className="p-4 mt-4">
            <h3 className="font-semibold text-sm mb-3">Upcoming Deadlines</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-muted-foreground">No upcoming tasks</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${priorityColor[task.priority] ?? 'bg-gray-400'}`} />
                    <span className="flex-1 truncate">{task.title}</span>
                    <span className="text-muted-foreground flex-shrink-0">{format(new Date(task.date + 'T00:00:00'), 'MMM d')}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <QuickAddTask />
    </div>
  )
}
