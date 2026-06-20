'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { useAppStore } from '@/store/useAppStore'
import { QuickAddTask } from '@/components/tasks/quick-add-task'
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'

const tasksByDate: Record<string, { title: string; time?: string; priority: string; color: string }[]> = {
  [format(new Date(), 'yyyy-MM-dd')]: [
    { title: 'Team standup', time: '10:00', priority: 'p2', color: 'bg-orange-400' },
    { title: 'Design review', time: '14:00', priority: 'p1', color: 'bg-red-500' },
    { title: 'Write proposal', time: '17:00', priority: 'p1', color: 'bg-red-500' },
  ],
  [format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')]: [
    { title: 'Quarterly report due', time: '09:00', priority: 'p1', color: 'bg-red-500' },
    { title: '1:1 with manager', time: '15:00', priority: 'p2', color: 'bg-orange-400' },
  ],
  [format(new Date(Date.now() + 86400000 * 3), 'yyyy-MM-dd')]: [
    { title: 'Sprint planning', time: '10:00', priority: 'p1', color: 'bg-red-500' },
  ],
}

export default function CalendarPage() {
  const [selected, setSelected] = useState<Date>(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const { setQuickAddOpen } = useAppStore()

  const selectedKey = format(selected, 'yyyy-MM-dd')
  const dayTasks = tasksByDate[selectedKey] || []

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
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              className="w-full"
              modifiers={{
                hasTasks: (date) => {
                  const key = format(date, 'yyyy-MM-dd')
                  return !!tasksByDate[key]?.length
                }
              }}
              modifiersClassNames={{
                hasTasks: 'font-bold'
              }}
            />
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
                {dayTasks.map((task, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className={`w-1 h-full min-h-8 rounded-full flex-shrink-0 ${task.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.time && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />{task.time}
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
            <div className="space-y-2">
              {Object.entries(tasksByDate)
                .filter(([date]) => new Date(date) >= new Date())
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .slice(0, 5)
                .flatMap(([date, tasks]) => tasks.map(t => ({ ...t, date })))
                .map((task, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${task.color}`} />
                    <span className="flex-1 truncate">{task.title}</span>
                    <span className="text-muted-foreground flex-shrink-0">{format(new Date(task.date), 'MMM d')}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>

      <QuickAddTask />
    </div>
  )
}
