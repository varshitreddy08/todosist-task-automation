'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/useAppStore'
import { QuickAddTask } from '@/components/tasks/quick-add-task'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  CheckCircle2, Circle, Clock, Flame,
  TrendingUp, Calendar, AlertCircle, Sparkles, Plus,
  ArrowRight, BarChart3, Zap, Brain, Mail, Loader2,
} from 'lucide-react'
import type { Task } from '@/types'

const priorityConfig = {
  p1: { label: 'P1', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  p2: { label: 'P2', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  p3: { label: 'P3', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  p4: { label: 'P4', color: 'text-muted-foreground', bg: 'bg-muted' },
}

const mockTasks: Task[] = [
  {
    id: '1', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null,
    title: 'Review design mockups', status: 'completed', priority: 'p1',
    due_date: format(new Date(), 'yyyy-MM-dd'), due_time: null, is_recurring: false,
    recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 0,
    estimated_minutes: 30, actual_minutes: null, completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null,
  },
  {
    id: '2', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null,
    title: 'Write project proposal', status: 'in_progress', priority: 'p1',
    due_date: format(new Date(), 'yyyy-MM-dd'), due_time: '17:00', is_recurring: false,
    recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 1,
    estimated_minutes: 60, actual_minutes: null, completed_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null,
  },
  {
    id: '3', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null,
    title: 'Team standup call', status: 'todo', priority: 'p2',
    due_date: format(new Date(), 'yyyy-MM-dd'), due_time: '10:00', is_recurring: true,
    recurrence_rule: 'FREQ=DAILY', assigned_to: null, created_by: 'u1', position: 2,
    estimated_minutes: 15, actual_minutes: null, completed_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null,
  },
  {
    id: '4', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null,
    title: 'Update API documentation', status: 'todo', priority: 'p2',
    due_date: format(new Date(), 'yyyy-MM-dd'), due_time: null, is_recurring: false,
    recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 3,
    estimated_minutes: 45, actual_minutes: null, completed_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null,
  },
  {
    id: '5', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null,
    title: 'Review pull requests', status: 'todo', priority: 'p3',
    due_date: format(new Date(), 'yyyy-MM-dd'), due_time: null, is_recurring: false,
    recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 4,
    estimated_minutes: 20, actual_minutes: null, completed_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null,
  },
]

const aiPlan = [
  { time: '9:00 AM', task: 'Write project proposal', duration: 60, type: 'deep' },
  { time: '10:00 AM', task: 'Team standup call', duration: 15, type: 'meeting' },
  { time: '10:30 AM', task: 'Update API documentation', duration: 45, type: 'medium' },
  { time: '11:30 AM', task: 'Review pull requests', duration: 20, type: 'quick' },
]

const upcomingDeadlines = [
  { title: 'Quarterly report', project: 'Q4 Planning', due: 'Tomorrow', priority: 'p1' as const, urgent: true },
  { title: 'Design system audit', project: 'Design Sprint', due: 'In 3 days', priority: 'p2' as const, urgent: false },
  { title: 'User research summary', project: 'Research', due: 'Next week', priority: 'p2' as const, urgent: false },
]

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [sendingEmail, setSendingEmail] = useState(false)
  const { setQuickAddOpen } = useAppStore()
  const today = new Date()
  const supabase = createClient()

  async function sendDailySummary() {
    setSendingEmail(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { toast.error('No email found'); return }

      const todayStr = format(today, 'yyyy-MM-dd')
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
          summary: {
            name: user.user_metadata?.full_name || user.email,
            completed,
            pending,
            overdue,
          },
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

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  function toggleTask(id: string) {
    setTasks(prev => prev.map(t =>
      t.id === id
        ? {
            ...t,
            status: t.status === 'completed' ? 'todo' : 'completed' as const,
            completed_at: t.status !== 'completed' ? new Date().toISOString() : null,
          }
        : t
    ))
  }

  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{greeting}! 👋</h1>
            <p className="text-muted-foreground mt-1">
              {format(today, 'EEEE, MMMM d')} ·{' '}
              {completedCount === 0
                ? "Let's get started!"
                : `${completedCount} task${completedCount > 1 ? 's' : ''} done`}
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
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: "Today's Tasks", value: totalCount, icon: CheckCircle2, color: 'text-primary', sub: `${completedCount} completed` },
          { label: 'Completion', value: `${completionPct}%`, icon: TrendingUp, color: 'text-emerald-500', sub: "Today's rate" },
          { label: 'Current Streak', value: '12', icon: Flame, color: 'text-orange-500', sub: 'days' },
          { label: 'Productivity', value: '87', icon: Zap, color: 'text-violet-500', sub: 'Score' },
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
        {/* Today's tasks + Upcoming deadlines */}
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
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground gap-1"
                onClick={() => {}}
              >
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {tasks.map((task, i) => {
                const p = priorityConfig[task.priority]
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors group cursor-pointer ${task.status === 'completed' ? 'opacity-60' : ''}`}
                    onClick={() => toggleTask(task.id)}
                  >
                    <button
                      className="flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); toggleTask(task.id) }}
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
                    <div className="flex items-center gap-2">
                      {task.is_recurring && (
                        <span title="Recurring" className="text-muted-foreground/60">↻</span>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}>
                        {p.label}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
              <button
                onClick={() => setQuickAddOpen(true)}
                className="w-full flex items-center gap-2 p-3 rounded-lg border-dashed border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-primary"
              >
                <Plus className="w-4 h-4" /> Add a task
              </button>
            </div>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Upcoming Deadlines
              </h2>
              <Badge variant="secondary" className="text-xs">3 upcoming</Badge>
            </div>
            <div className="space-y-3">
              {upcomingDeadlines.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.urgent ? 'bg-red-500' : 'bg-orange-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.project}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${item.urgent ? 'text-red-500' : 'text-orange-500'}`}>
                      {item.due}
                    </p>
                    <span className={`text-[10px] ${priorityConfig[item.priority].color}`}>
                      {priorityConfig[item.priority].label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Right column */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* AI Daily Plan */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Daily Plan</h3>
                <p className="text-xs text-muted-foreground">Optimized schedule</p>
              </div>
            </div>
            <div className="space-y-3">
              {aiPlan.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="text-xs text-muted-foreground w-16 flex-shrink-0 pt-0.5">{item.time}</div>
                  <div className="flex-1">
                    <div className={`h-full rounded-lg px-3 py-2 text-xs ${
                      item.type === 'deep'
                        ? 'bg-primary/10 text-primary'
                        : item.type === 'meeting'
                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400'
                        : item.type === 'quick'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <p className="font-medium truncate">{item.task}</p>
                      <p className="opacity-70 mt-0.5">{item.duration} min</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4 text-xs gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> Regenerate Plan
            </Button>
          </Card>

          {/* This Week chart */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">This Week</h3>
            </div>
            <div className="flex items-end gap-1 h-20 mb-3">
              {[
                { day: 'M', pct: 75 },
                { day: 'T', pct: 90 },
                { day: 'W', pct: 60 },
                { day: 'T', pct: 85 },
                { day: 'F', pct: 70 },
                { day: 'S', pct: 40 },
                { day: 'S', pct: 0 },
              ].map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm transition-all ${d.pct > 0 ? 'bg-primary/70' : 'bg-muted'}`}
                    style={{ height: `${d.pct}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Weekly avg</span>
              <span className="font-semibold text-primary">74%</span>
            </div>
          </Card>

          {/* AI Insights */}
          <Card className="p-5 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-primary">AI Insight</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your peak productivity window is{' '}
              <strong className="text-foreground">9–11am</strong>. Schedule your most
              important tasks during this time for best results.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                Focus: 9-11am
              </Badge>
              <Badge className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                Streak: 12 days
              </Badge>
            </div>
          </Card>
        </motion.div>
      </div>

      <QuickAddTask />
    </div>
  )
}
