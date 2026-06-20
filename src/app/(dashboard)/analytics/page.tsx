'use client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, CheckCircle2, Flame, Target, Clock, Zap, Brain, Award, BarChart3 } from 'lucide-react'

const weeklyData = [
  { day: 'Mon', completed: 8, created: 5, hours: 6.5 },
  { day: 'Tue', completed: 12, created: 8, hours: 7.2 },
  { day: 'Wed', completed: 6, created: 10, hours: 5.8 },
  { day: 'Thu', completed: 15, created: 6, hours: 8.1 },
  { day: 'Fri', completed: 10, created: 7, hours: 6.9 },
  { day: 'Sat', completed: 4, created: 2, hours: 3.2 },
  { day: 'Sun', completed: 2, created: 1, hours: 1.5 },
]

const monthlyData = [
  { month: 'Sep', completed: 68, rate: 72 },
  { month: 'Oct', completed: 85, rate: 81 },
  { month: 'Nov', completed: 92, rate: 88 },
  { month: 'Dec', completed: 78, rate: 85 },
  { month: 'Jan', completed: 105, rate: 91 },
]

const priorityData = [
  { name: 'P1 - Urgent', value: 18, color: '#ef4444' },
  { name: 'P2 - High', value: 35, color: '#f97316' },
  { name: 'P3 - Medium', value: 28, color: '#3b82f6' },
  { name: 'P4 - Low', value: 19, color: '#6b7280' },
]

const projectData = [
  { name: 'Design Sprint', completed: 16, pending: 8, color: '#6366f1' },
  { name: 'Q4 Planning', completed: 5, pending: 13, color: '#22c55e' },
  { name: 'Research', completed: 10, pending: 2, color: '#f59e0b' },
  { name: 'Personal', completed: 14, pending: 16, color: '#ec4899' },
]

const aiInsights = [
  { title: 'Peak Performance', desc: 'You complete 40% more tasks between 9–11am. Schedule deep work here.', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
  { title: 'Completion Trend', desc: 'Your completion rate improved by 15% this month. Keep the momentum!', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { title: 'Overdue Alert', desc: '3 P1 tasks are overdue. Prioritize these today to stay on track.', icon: Target, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  { title: 'Focus Time', desc: 'Average deep work session: 47 min. Try extending to 90 min for flow state.', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
]

export default function AnalyticsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your productivity and performance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tasks Completed', value: '105', change: '+23%', icon: CheckCircle2, color: 'text-primary' },
          { label: 'Completion Rate', value: '91%', change: '+6%', icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Streak', value: '12 days', change: 'Personal best!', icon: Flame, color: 'text-orange-500' },
          { label: 'Productivity Score', value: '87/100', change: '+5pts', icon: Zap, color: 'text-violet-500' },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {kpi.change}
                </p>
              </div>
              <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="projects">By Project</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Tasks Completed vs Created</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="oklch(0.55 0.22 264)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="created" name="Created" fill="oklch(0.55 0.22 264 / 30%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Hours Worked</h3>
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
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Monthly Completion Rate</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="rate" name="Completion %" fill="oklch(0.55 0.22 264 / 20%)" stroke="oklch(0.55 0.22 264)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Tasks by Project</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill="oklch(0.55 0.22 264)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="oklch(0.55 0.22 264 / 25%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Task Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${(name ?? '').split(' - ')[0]} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Insights */}
      <div>
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> AI Productivity Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiInsights.map((insight) => (
            <Card key={insight.title} className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${insight.bg} flex items-center justify-center flex-shrink-0`}>
                  <insight.icon className={`w-5 h-5 ${insight.color}`} />
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
