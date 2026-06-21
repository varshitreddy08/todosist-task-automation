'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useProject, useUpdateProject } from '@/hooks/useProjects'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Loader2, CheckCircle2, Circle, Star, Trash2,
  CheckSquare
} from 'lucide-react'
import type { Task } from '@/types'

const priorityConfig = {
  p1: { label: 'P1', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  p2: { label: 'P2', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  p3: { label: 'P3', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  p4: { label: 'P4', color: 'text-muted-foreground', bg: 'bg-muted' },
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const workspaceId = useWorkspace()

  const { data: project, isLoading: projectLoading } = useProject(id)
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(id)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const updateProject = useUpdateProject()

  const [newTitle, setNewTitle] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Sync calculated progress back to the project record
  useEffect(() => {
    if (!project || project.progress === progress) return
    updateProject.mutate({ id, progress })
  }, [progress, project?.progress])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`project-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `project_id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks', id] })
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'projects',
        filter: `id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['projects', id] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, queryClient, supabase])

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !workspaceId) return
    setAdding(true)
    try {
      await createTask.mutateAsync({
        title: newTitle.trim(),
        project_id: id,
        workspace_id: workspaceId,
        status: 'todo',
        priority: 'p4',
        is_recurring: false,
        position: tasks.length,
      })
      setNewTitle('')
      setShowForm(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add task'
      toast.error(msg)
    } finally {
      setAdding(false)
    }
  }

  async function toggleTask(task: Task) {
    const next = task.status === 'completed' ? 'todo' : 'completed'
    await updateTask.mutateAsync({
      id: task.id,
      status: next,
      completed_at: next === 'completed' ? new Date().toISOString() : null,
    })
  }

  async function handleDelete(taskId: string) {
    await deleteTask.mutateAsync(taskId)
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" onClick={() => router.push('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: (project.color || '#6366f1') + '20' }}>
            {project.icon || '📁'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.is_favorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
            </div>
            {project.description && <p className="text-muted-foreground text-sm">{project.description}</p>}
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
          Live
          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Progress', value: `${progress}%`, color: 'text-primary' },
          { label: 'Completed', value: completedCount, color: 'text-emerald-500' },
          { label: 'Total Tasks', value: totalCount, color: 'text-foreground' },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            Overall Progress
          </h2>
          <span className="text-sm font-medium text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {completedCount} of {totalCount} task{totalCount !== 1 ? 's' : ''} completed
        </p>
      </Card>

      {/* Tasks */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Tasks</h2>
          <Button
            size="sm"
            className="gradient-primary text-white border-0 gap-1 h-7 text-xs"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-3 h-3" /> Add Task
          </Button>
        </div>

        {tasksLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {tasks.map((task, i) => {
                const p = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.p4
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors group ${task.status === 'completed' ? 'opacity-60' : ''}`}
                  >
                    <button className="flex-shrink-0" onClick={() => toggleTask(task)}>
                      {task.status === 'completed'
                        ? <CheckCircle2 className="w-5 h-5 text-primary" />
                        : <Circle className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      }
                    </button>
                    <span className={`flex-1 text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}>
                      {p.label}
                    </span>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Inline add form */}
            <AnimatePresence>
              {showForm && (
                <motion.form
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  onSubmit={handleAddTask}
                  className="flex items-center gap-2 p-2 border rounded-lg border-primary/40 bg-primary/5"
                >
                  <Input
                    autoFocus
                    placeholder="Task name…"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Escape' && setShowForm(false)}
                    className="flex-1 h-7 text-sm border-0 bg-transparent focus-visible:ring-0 px-0"
                  />
                  <Button type="submit" size="sm" className="h-6 text-xs gradient-primary text-white border-0" disabled={adding || !newTitle.trim()}>
                    {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center gap-2 p-3 rounded-lg border-dashed border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-primary"
              >
                <Plus className="w-4 h-4" /> Add a task
              </button>
            )}

            {tasks.length === 0 && !showForm && (
              <p className="text-center text-sm text-muted-foreground py-6">
                No tasks yet. Add your first one!
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
