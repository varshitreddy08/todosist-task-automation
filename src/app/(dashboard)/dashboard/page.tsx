'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, addDays, startOfWeek } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/useAppStore'
import { QuickAddTask } from '@/components/tasks/quick-add-task'
import { useUpdateTask } from '@/hooks/useTasks'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  CheckCircle2, Circle, Clock,
  TrendingUp, Calendar, AlertCircle, Plus,
  BarChart3, Brain, Mail, Loader2, Target,
} from 'lucide-react'
import type { Task } from '@/types'

const priorityConfig = {
  p1: { label: 'P1', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  p2: { label: 'P2', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  p3: { label: 'P3', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  p4: { label: 'P4', color: 'text-muted-foreground', bg: 'bg-muted' },
}

const supabase = createClient()

export default function DashboardPage() {
  const [sendingEmail, setSendingEmail] = useState(false)
  const { setQuickAddOpen } = useAppStore()
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const updateTask = useUpdateTask()

  const { data: todayTasks = [], isLoading: loadingToday } = useQuery({
    queryKey: ['tasks', 'dashboard-today', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('due_date', todayStr)
        .order('priority', { ascending: true })
      if (error) throw error
      return (data ?? []) as Task[]
    },
  })

  const { data: upcomingTasks = [] } = useQuery({
    queryKey: ['tasks', 'upcoming', todayStr],
    queryFn: async () => {
      const twoWeeks = format(addDays(today, 14), 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .gt('due_date', todayStr)
        .lte('due_date', twoWeeks)
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
        .limit(5)
      if (error) throw error
      return (data ?? []) as Task[]
    },
  })

  const { data: weekRaw = [] } = useQuery({
    queryKey: ['tasks', 'week-chart', todayStr],
    queryFn: async () => {
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('tasks')
        .select('due_date, status')
        .gte('due_date', weekStart)
        .lte('due_date', todayStr)
      if (error) throw error
      return data ?? []
    },
  })

  const completedCount = todayTasks.filter(t => t.status === 'completed').length
  const totalCount = todayTasks.length
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekChartData = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
    const dayStr = format(addDays(weekStart, i), 'yyyy-MM-dd')
    const dayTasks = weekRaw.filter(t => t.due_date === dayStr)
    const total = dayTasks.length
    const done = dayTasks.filter(t => t.status === 'completed').length
    return {
      label,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      isFuture: dayStr > todayStr,
    }
  })
  const filledDays = weekChartData.filter(d => !d.isFuture && d.pct > 0)
  const weekAvg = filledDays.length > 0
    ? Math.round(filledDays.reduce((a, b) => a + b.pct, 0) / filledDays.length)
    : 0

  const pendingTasks = todayTasks.filter(t => t.status !== 'completed')
  const planItems = pendingTasks.slice(0, 4).map((task, i) => {
    const h = 9 + i
    const time = `${h}:00 ${h < 12 ? 'AM' : 'PM'}`
    const type = task.priority === 'p1' ? 'deep' : task.priority === 'p2' ? 'medium' : 'quick'
    return { time, title: task.title, duration: task.estimated_minutes ?? 30, type }
  })

  function getDaysUntil(dateStr: string) {
    const diff = new Date(dateStr + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()
    return Math.round(diff / (1000 * 60 * 60 * 24))
  }

  function dueLabel(days: number) {
    if (days === 1) return 'Tomorrow'
    if (days <= 6) return `In ${days} days`
    return format(addDays(new Date(todayStr + 'T00:00:00'), days), 'MMM d')
  }

  async function toggleTask(id: string, status: string) {
    await updateTask.mutateAsync({
      id,
      status: status === 'completed' ? 'todo' : 'completed',
      completed_at: status !== 'completed' ? new Date().toISOString() : null,
    })
  }

  async function sendDailySummary() {
    setSendingEmail(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { toast.error('No email found'); return }

      const { data: allTasks } = await supabase
        .from('tasks').select('status, due_date').eq('created_by', user.id)

      const completed = (allTasks ?? []).filter(t => t.status === 'completed' && t.due_date === todayStr).length
      const pending = (allTasks ?? []).filter(t => t.status !== 'completed' && t.due_date === todayStr).length
      const overdue = (allTasks ?? []).filter(t => t.status !== 'completed' && t.due_date && t.due_date < todayStr).length

      const res = await fetch('/api/email/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          summary: { name: user.user_metadata?.full_name || user.email, completed, pending, overdue },
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Daily summary sent to ' + user.email)
    } catch {
      toast.error('Failed to send email — check your RESEND_API_KEY')
    } finally {
      setSendingEmail(false)
    }
  }

  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{greeting}! 👋</h1>
            <p className="text-muted-foreground mt-1">
              {format(today, 'EEEE, MMMM d')} ·{' '}
              {totalCount === 0
                ? "No tasks today — add one!"
                : completedCount === 0
                ? `${totalCount} task${totalCount > 1 ? 's' : ''} to do`
                : `${completedCount} of ${totalCount} done`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={sendDailySummary}
              disabled={sendingEmail}
            >
              {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Daily Summary
            </Button>
            <Button
              className="gradient-primary text-white border-0 gap-2"
              onClick={() => setQuickAddOpen(true)}
            >
              <Plus className="w-4 h-4" /> Add Task
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: "Today's Tasks", value: loadingToday ? '…' : totalCount, icon: CheckCircle2, color: 'text-primary', sub: `${completedCount} completed` },
          { label: 'Completion', value: loadingToday ? '…' : `${completionPct}%`, icon: TrendingUp, color: 'text-emerald-500', sub: "Today's rate" },
          { label: 'This Week', value: weekAvg > 0 ? `${weekAvg}%` : '—', icon: BarChart3, color: 'text-violet-500', sub: 'Avg completion' },
          { label: 'Upcoming', value: upcomingTasks.length, icon: Calendar, color: 'text-orange-500', sub: 'Due in 2 weeks' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-4"
        >
          {/* Today's Tasks */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg">Today&apos;s Tasks</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={completionPct} className="w-24 h-1.5" />
                  <span className="text-xs text-muted-foreground">{completedCount}/{totalCount}</span>
                </div>
              </div>
            </div>

            {loadingToday ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 opacity-20" />
                <p className="text-sm">No tasks due today</p>
                <p className="text-xs opacity-60">Add a task to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task, i) => {
                  const p = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.p4
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors group cursor-pointer ${task.status === 'completed' ? 'opacity-60' : ''}`}
                      onClick={() => toggleTask(task.id, task.status)}
                    >
                      <button
                        className="flex-shrink-0"
                        onClick={e => { e.stopPropagation(); toggleTask(task.id, task.status) }}
                      >
                        {task.status === 'completed'
                          ? <CheckCircle2 className="w-5 h-5 text-primary" />
                          : <Circle className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        {task.due_time && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {task.due_time}
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}>
                        {p.label}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => setQuickAddOpen(true)}
              className="w-full flex items-center gap-2 p-3 mt-2 rounded-lg border-dashed border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-primary"
            >
              <Plus className="w-4 h-4" /> Add a task
            </button>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Upcoming Deadlines
              </h2>
              {upcomingTasks.length > 0 && (
                <Badge variant="secondary" className="text-xs">{upcomingTasks.length} upcoming</Badge>
              )}
            </div>

            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                <Calendar className="w-8 h-8 opacity-20" />
                <p className="text-sm">No upcoming deadlines</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map(task => {
                  const days = getDaysUntil(task.due_date!)
                  const urgent = days <= 2
                  const p = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.p4
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urgent ? 'bg-red-500' : 'bg-orange-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(task.due_date + 'T00:00:00'), 'MMM d')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-medium ${urgent ? 'text-red-500' : 'text-orange-500'}`}>
                          {dueLabel(days)}
                        </p>
                        <span className={`text-[10px] ${p.color}`}>{p.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Right column */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* Today's Plan */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Today&apos;s Plan</h3>
                <p className="text-xs text-muted-foreground">Pending tasks</p>
              </div>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 opacity-30 text-primary" />
                <p className="text-sm">
                  {totalCount === 0 ? 'No tasks yet' : 'All done for today!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {planItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="text-xs text-muted-foreground w-16 flex-shrink-0 pt-0.5">{item.time}</div>
                    <div className="flex-1">
                      <div className={`rounded-lg px-3 py-2 text-xs ${
                        item.type === 'deep'
                          ? 'bg-primary/10 text-primary'
                          : item.type === 'medium'
                          ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                      }`}>
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="opacity-70 mt-0.5">{item.duration} min</p>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingTasks.length > 4 && (
                  <p className="text-xs text-muted-foreground text-center">+{pendingTasks.length - 4} more</p>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 text-xs gap-1"
              onClick={() => setQuickAddOpen(true)}
            >
              <Plus className="w-3 h-3" /> Add Task
            </Button>
          </Card>

          {/* This Week chart */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">This Week</h3>
            </div>
            <div className="flex items-end gap-1 h-20 mb-3">
              {weekChartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm transition-all ${
                      d.isFuture ? 'bg-muted/20' : d.pct > 0 ? 'bg-primary/70' : 'bg-muted/40'
                    }`}
                    style={{ height: d.isFuture ? '4px' : `${Math.max(d.pct, 4)}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Weekly avg</span>
              <span className={`font-semibold ${weekAvg > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                {weekAvg > 0 ? `${weekAvg}%` : '—'}
              </span>
            </div>
          </Card>

          {/* Progress card */}
          <Card className="p-5 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-primary">Progress</h3>
            </div>
            {totalCount === 0 ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Add your first task to start tracking your progress today.
              </p>
            ) : completionPct === 100 ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">All tasks done!</strong> Excellent work today.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                You&apos;ve completed{' '}
                <strong className="text-foreground">{completedCount} of {totalCount}</strong>{' '}
                tasks today. {completionPct >= 50 ? 'Keep going!' : 'You got this!'}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                Today: {completionPct}%
              </Badge>
              {upcomingTasks.length > 0 && (
                <Badge className="text-[10px] bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                  Upcoming: {upcomingTasks.length}
                </Badge>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      <QuickAddTask />
    </div>
  )
}
