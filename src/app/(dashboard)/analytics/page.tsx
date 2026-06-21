'use client'
import { useQuery } from '@tanstack/react-query'
import { format, addDays, startOfWeek, startOfMonth, subMonths } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, CheckCircle2, Flame, Target, Zap, Brain, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const PRIORITY_COLORS = { p1: '#ef4444', p2: '#f97316', p3: '#3b82f6', p4: '#6b7280' }
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function AnalyticsPage() {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['analytics-tasks'],
    queryFn: async () => {
      const since = format(subMonths(today, 6), 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status, priority, created_at, completed_at, due_date, project_id, estimated_minutes')
        .gte('created_at', since + 'T00:00:00')
      if (error) throw error
      return data ?? []
    },
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['analytics-projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name')
      if (error) throw error
      return data ?? []
    },
  })

  // ── KPI computations ────────────────────────────────────────────────
  const thisMonthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const lastMonthStart = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd')

  const thisMonth = tasks.filter(t => (t.created_at as string).startsWith(thisMonthStart.slice(0, 7)))
  const lastMonth = tasks.filter(t => (t.created_at as string).startsWith(lastMonthStart.slice(0, 7)))

  const thisCompleted = thisMonth.filter(t => t.status === 'completed').length
  const lastCompleted = lastMonth.filter(t => t.status === 'completed').length
  const completedDiff = thisCompleted - lastCompleted

  const thisRate = thisMonth.length > 0 ? Math.round((thisCompleted / thisMonth.length) * 100) : 0
  const lastRate = lastMonth.length > 0 ? Math.round((lastCompleted / lastMonth.length) * 100) : 0
  const rateDiff = thisRate - lastRate

  // streak
  const doneDates = new Set(
    tasks.filter(t => t.completed_at).map(t => (t.completed_at as string).split('T')[0])
  )
  let streak = 0
  let checkDay = new Date()
  if (!doneDates.has(format(checkDay, 'yyyy-MM-dd'))) checkDay = addDays(checkDay, -1)
  while (doneDates.has(format(checkDay, 'yyyy-MM-dd'))) { streak++; checkDay = addDays(checkDay, -1) }

  // productivity score (0–100): completion rate drives 70%, streak drives 30%
  const score = Math.min(100, Math.round(thisRate * 0.7 + Math.min(streak * 2, 30)))
  const lastScore = Math.min(100, Math.round(lastRate * 0.7))
  const scoreDiff = score - lastScore

  // overdue P1
  const overdueP1 = tasks.filter(t => t.status !== 'completed' && t.priority === 'p1' && t.due_date && t.due_date < todayStr).length

  // ── Weekly chart ────────────────────────────────────────────────────
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weeklyData = WEEK_LABELS.map((day, i) => {
    const ds = format(addDays(weekStart, i), 'yyyy-MM-dd')
    const completed = tasks.filter(t => t.completed_at && (t.completed_at as string).startsWith(ds)).length
    const created = tasks.filter(t => (t.created_at as string).startsWith(ds)).length
    const hours = tasks
      .filter(t => t.completed_at && (t.completed_at as string).startsWith(ds) && t.estimated_minutes)
      .reduce((s, t) => s + (t.estimated_minutes ?? 0), 0) / 60
    return { day, completed, created, hours: Math.round(hours * 10) / 10 }
  })

  // ── Monthly chart (last 6 months) ───────────────────────────────────
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const mo = subMonths(today, 5 - i)
    const prefix = format(mo, 'yyyy-MM')
    const mt = tasks.filter(t => (t.created_at as string).startsWith(prefix))
    const mc = mt.filter(t => t.status === 'completed').length
    return {
      month: format(mo, 'MMM'),
      completed: mc,
      rate: mt.length > 0 ? Math.round((mc / mt.length) * 100) : 0,
    }
  })

  // ── Project breakdown ────────────────────────────────────────────────
  const projectData = projects
    .map(p => {
      const pt = tasks.filter(t => t.project_id === p.id)
      return {
        name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
        completed: pt.filter(t => t.status === 'completed').length,
        pending: pt.filter(t => t.status !== 'completed').length,
      }
    })
    .filter(p => p.completed + p.pending > 0)

  // ── Priority distribution ────────────────────────────────────────────
  const priorityDist = (Object.keys(PRIORITY_COLORS) as Array<keyof typeof PRIORITY_COLORS>)
    .map(k => ({ name: `${k.toUpperCase()} – ${k === 'p1' ? 'Urgent' : k === 'p2' ? 'High' : k === 'p3' ? 'Medium' : 'Low'}`, value: tasks.filter(t => t.priority === k).length, color: PRIORITY_COLORS[k] }))
    .filter(d => d.value > 0)

  // ── AI insights from real data ───────────────────────────────────────
  const hourBuckets: Record<number, number> = {}
  tasks.filter(t => t.completed_at).forEach(t => {
    const h = new Date(t.completed_at as string).getHours()
    hourBuckets[h] = (hourBuckets[h] ?? 0) + 1
  })
  const topEntry = Object.entries(hourBuckets).sort(([, a], [, b]) => b - a)[0]
  const peakHour = topEntry ? parseInt(topEntry[0]) : null

  const insights = [
    {
      title: 'Peak Performance',
      desc: peakHour !== null
        ? `You complete the most tasks around ${peakHour}:00–${peakHour + 1}:00. Schedule your deep work then.`
        : 'Complete more tasks to discover your peak productivity hours.',
      icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    },
    {
      title: 'Completion Trend',
      desc: rateDiff > 0
        ? `Completion rate up ${rateDiff}% vs last month — great momentum!`
        : rateDiff < 0
        ? `Completion rate down ${Math.abs(rateDiff)}% vs last month. Try smaller task breakdowns.`
        : tasks.length === 0 ? 'Add your first tasks to track completion trends.' : 'Completion rate is steady vs last month.',
      icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: overdueP1 > 0 ? 'Overdue Alert' : 'No Overdue P1s',
      desc: overdueP1 > 0
        ? `${overdueP1} P1 task${overdueP1 > 1 ? 's are' : ' is'} overdue. Prioritize ${overdueP1 > 1 ? 'these' : 'this'} today.`
        : 'No overdue urgent tasks right now — great job staying on top of things!',
      icon: Target,
      color: overdueP1 > 0 ? 'text-red-500' : 'text-emerald-500',
      bg: overdueP1 > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Streak',
      desc: streak > 1
        ? `${streak}-day streak! Keep completing tasks daily to keep it going.`
        : streak === 1
        ? `1-day streak started — complete tasks tomorrow to keep it alive!`
        : 'Complete at least one task today to start a streak.',
      icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  function diffLabel(n: number, unit = '') {
    if (n === 0) return { text: 'Same as last month', positive: true }
    return { text: `${n > 0 ? '+' : ''}${n}${unit} vs last month`, positive: n > 0 }
  }

  const kpis = [
    { label: 'Tasks Completed', value: thisCompleted, sub: diffLabel(completedDiff), icon: CheckCircle2, color: 'text-primary' },
    { label: 'Completion Rate', value: `${thisRate}%`, sub: diffLabel(rateDiff, '%'), icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Current Streak', value: streak > 0 ? `${streak} day${streak > 1 ? 's' : ''}` : '—', sub: { text: streak > 0 ? 'days in a row' : 'No streak yet', positive: streak > 0 }, icon: Flame, color: 'text-orange-500' },
    { label: 'Productivity Score', value: tasks.length > 0 ? `${score}/100` : '—', sub: diffLabel(scoreDiff, 'pts'), icon: Zap, color: 'text-violet-500' },
  ]

  const noTasksYet = tasks.length === 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your productivity and performance</p>
      </motion.div>

      {/* KPI cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className={`text-xs mt-1 flex items-center gap-1 ${kpi.sub.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kpi.sub.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.sub.text}
                </p>
              </div>
              <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Charts */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="projects">By Project</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4">
            {noTasksYet ? (
              <EmptyChart message="Add tasks with due dates to see weekly breakdowns." />
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Tasks Completed vs Created</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="completed" name="Completed" fill="oklch(0.55 0.22 264)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="created" name="Created" fill="oklch(0.55 0.22 264 / 30%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold mb-1">Estimated Hours</h3>
                  <p className="text-xs text-muted-foreground mb-4">Based on task estimated minutes</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Area type="monotone" dataKey="hours" name="Hours" fill="oklch(0.55 0.22 264 / 20%)" stroke="oklch(0.55 0.22 264)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            {noTasksYet ? (
              <EmptyChart message="Add tasks to see monthly trends over time." />
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Tasks Completed per Month</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Bar dataKey="completed" name="Completed" fill="oklch(0.55 0.22 264)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Monthly Completion Rate</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(v) => [`${v}%`, 'Rate']} />
                      <Area type="monotone" dataKey="rate" name="Completion %" fill="oklch(0.55 0.22 264 / 20%)" stroke="oklch(0.55 0.22 264)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            {projectData.length === 0 ? (
              <EmptyChart message="Create projects and add tasks to see a project breakdown." />
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Tasks by Project</h3>
                  <ResponsiveContainer width="100%" height={Math.max(250, projectData.length * 52)}>
                    <BarChart data={projectData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="completed" name="Completed" stackId="a" fill="oklch(0.55 0.22 264)" />
                      <Bar dataKey="pending" name="Pending" stackId="a" fill="oklch(0.55 0.22 264 / 25%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Task Priority Distribution</h3>
                  {priorityDist.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No tasks yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={priorityDist}
                          cx="50%" cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }: { name?: string; percent?: number }) =>
                            `${(name ?? '').split(' – ')[0]} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {priorityDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }}
                          formatter={(v, _, props) => [v, (props as { payload?: { name?: string } }).payload?.name ?? '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* AI Insights */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> Productivity Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins) => (
            <Card key={ins.title} className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${ins.bg} flex items-center justify-center flex-shrink-0`}>
                  <ins.icon className={`w-5 h-5 ${ins.color}`} />
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">{ins.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ins.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <Card className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <CheckCircle2 className="w-10 h-10 opacity-20" />
      <p className="text-sm">{message}</p>
    </Card>
  )
}
