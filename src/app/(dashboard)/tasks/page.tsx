'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { useAppStore } from '@/store/useAppStore'
import { QuickAddTask } from '@/components/tasks/quick-add-task'
import {
  CheckCircle2, Circle, Search, Filter, LayoutList, Columns3,
  Calendar, Plus, MoreHorizontal, Trash2, Edit, Clock, Flag
} from 'lucide-react'
import type { Task, Priority } from '@/types'
import { format } from 'date-fns'

const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  p1: { label: 'P1', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  p2: { label: 'P2', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  p3: { label: 'P3', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  p4: { label: 'P4', color: 'text-muted-foreground', bg: 'bg-muted' },
}

const statusConfig = {
  todo: { label: 'To Do', color: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'text-blue-500' },
  completed: { label: 'Done', color: 'text-emerald-500' },
}

const mockTasks: Task[] = [
  { id: '1', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Design new landing page', status: 'in_progress', priority: 'p1', due_date: format(new Date(), 'yyyy-MM-dd'), due_time: '17:00', is_recurring: false, recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 0, estimated_minutes: 120, actual_minutes: null, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: 'Create a modern, responsive landing page for the product' },
  { id: '2', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Write project proposal', status: 'todo', priority: 'p1', due_date: format(new Date(), 'yyyy-MM-dd'), due_time: null, is_recurring: false, recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 1, estimated_minutes: 60, actual_minutes: null, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null },
  { id: '3', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Team standup call', status: 'completed', priority: 'p2', due_date: format(new Date(), 'yyyy-MM-dd'), due_time: '10:00', is_recurring: true, recurrence_rule: 'FREQ=DAILY', assigned_to: null, created_by: 'u1', position: 2, estimated_minutes: 15, actual_minutes: 15, completed_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null },
  { id: '4', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Update API documentation', status: 'todo', priority: 'p2', due_date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'), due_time: null, is_recurring: false, recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 3, estimated_minutes: 45, actual_minutes: null, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null },
  { id: '5', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Review pull requests', status: 'todo', priority: 'p3', due_date: format(new Date(Date.now() + 86400000 * 2), 'yyyy-MM-dd'), due_time: null, is_recurring: false, recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 4, estimated_minutes: 20, actual_minutes: null, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null },
  { id: '6', workspace_id: 'w1', project_id: null, section_id: null, parent_id: null, title: 'Fix authentication bug', status: 'completed', priority: 'p1', due_date: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'), due_time: null, is_recurring: false, recurrence_rule: null, assigned_to: null, created_by: 'u1', position: 5, estimated_minutes: 90, actual_minutes: 75, completed_at: new Date(Date.now() - 3600000).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: null },
]

const boardColumns = [
  { id: 'todo', title: 'To Do', color: 'border-muted-foreground/30' },
  { id: 'in_progress', title: 'In Progress', color: 'border-blue-400' },
  { id: 'completed', title: 'Done', color: 'border-emerald-400' },
]

function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const p = priorityConfig[task.priority]
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors border-b last:border-0 group ${task.status === 'completed' ? 'opacity-60' : ''}`}
    >
      <button onClick={() => onToggle(task.id)} className="flex-shrink-0">
        {task.status === 'completed'
          ? <CheckCircle2 className="w-5 h-5 text-primary" />
          : <Circle className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        {task.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.due_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(task.due_date), 'MMM d')}</span>
          </div>
        )}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}>{p.label}</span>
        <span className={`text-[10px] ${statusConfig[task.status].color}`}>{statusConfig[task.status].label}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  )
}

function TaskCard({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const p = priorityConfig[task.priority]
  return (
    <div className={`bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${task.status === 'completed' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2 mb-2">
        <button onClick={() => onToggle(task.id)} className="mt-0.5 flex-shrink-0">
          {task.status === 'completed'
            ? <CheckCircle2 className="w-4 h-4 text-primary" />
            : <Circle className="w-4 h-4 text-muted-foreground/40" />
          }
        </button>
        <p className={`text-sm font-medium flex-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
      </div>
      {task.description && <p className="text-xs text-muted-foreground mb-2 pl-6 line-clamp-2">{task.description}</p>}
      <div className="flex items-center gap-2 pl-6">
        {task.due_date && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
        {task.estimated_minutes && (
          <span className="text-[10px] text-muted-foreground">{task.estimated_minutes}m</span>
        )}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ml-auto ${p.bg} ${p.color}`}>{p.label}</span>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState(mockTasks)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const { setQuickAddOpen } = useAppStore()

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority
    return matchesSearch && matchesPriority
  })

  function toggleTask(id: string) {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' as const, completed_at: t.status !== 'completed' ? new Date().toISOString() : null } : t
    ))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">{filteredTasks.filter(t => t.status !== 'completed').length} remaining · {filteredTasks.filter(t => t.status === 'completed').length} completed</p>
        </div>
        <Button className="gradient-primary text-white border-0 gap-2" onClick={() => setQuickAddOpen(true)}>
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'p1', 'p2', 'p3', 'p4'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filterPriority === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {p === 'all' ? 'All' : p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list"><LayoutList className="w-4 h-4 mr-1.5" />List</TabsTrigger>
          <TabsTrigger value="board"><Columns3 className="w-4 h-4 mr-1.5" />Board</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/30 grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-6">Task</div>
              <div className="col-span-2">Due Date</div>
              <div className="col-span-2">Priority</div>
              <div className="col-span-2">Status</div>
            </div>
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No tasks found</p>
              </div>
            ) : (
              filteredTasks.map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} />)
            )}
            <button onClick={() => setQuickAddOpen(true)} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-t">
              <Plus className="w-4 h-4" /> Add task
            </button>
          </Card>
        </TabsContent>

        <TabsContent value="board">
          <div className="grid grid-cols-3 gap-4">
            {boardColumns.map(col => {
              const colTasks = filteredTasks.filter(t => t.status === col.id)
              return (
                <div key={col.id} className="bg-muted/30 rounded-xl p-4">
                  <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${col.color}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{col.title}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{colTasks.length}</Badge>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setQuickAddOpen(true)}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 min-h-32">
                    {colTasks.map(task => <TaskCard key={task.id} task={task} onToggle={toggleTask} />)}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <QuickAddTask />
    </div>
  )
}
