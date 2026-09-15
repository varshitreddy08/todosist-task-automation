'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useProject, useUpdateProject } from '@/hooks/useProjects'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Loader2, ChevronRight, ChevronDown,
  Trash2, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddSectionInline } from '@/components/tasks/add-section-inline'
import { celebrateCompletion } from '@/lib/task-notify'
import type { Task } from '@/types'

const IDLE_CLS = {
  p1: 'border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
  p2: 'border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30',
  p3: 'border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30',
  p4: 'border-muted-foreground/30 hover:bg-muted/50',
} as const
const DONE_CLS = {
  p1: 'bg-red-500 border-red-500',
  p2: 'bg-orange-400 border-orange-400',
  p3: 'bg-blue-400 border-blue-400',
  p4: 'bg-muted-foreground/30 border-muted-foreground/30',
} as const

function CheckCircle({ priority, done, onToggle }: { priority: string; done: boolean; onToggle: () => void }) {
  const p = priority as keyof typeof IDLE_CLS
  return (
    <button
      onClick={onToggle}
      className={cn(
        'mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all',
        done ? DONE_CLS[p] ?? DONE_CLS.p4 : IDLE_CLS[p] ?? IDLE_CLS.p4
      )}
    >
      {done && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: project, isLoading: projectLoading } = useProject(id)
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(id)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const updateProject = useUpdateProject()

  const [newTitle, setNewTitle] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const subtaskInputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  const parentTasks = tasks.filter(t => !t.parent_id)
  const subtaskMap = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (t.parent_id) {
      acc[t.parent_id] = acc[t.parent_id] ?? []
      acc[t.parent_id].push(t)
    }
    return acc
  }, {})

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const pendingParents = parentTasks.filter(t => t.status !== 'completed')
  const doneParents = parentTasks.filter(t => t.status === 'completed')

  useEffect(() => {
    if (!project || project.progress === progress) return
    updateProject.mutate({ id, progress })
  }, [progress, project?.progress])

  useEffect(() => {
    if (addingSubtaskFor) subtaskInputRef.current?.focus()
  }, [addingSubtaskFor])

  useEffect(() => {
    if (showAddForm) addInputRef.current?.focus()
  }, [showAddForm])

  function toggleExpand(taskId: string) {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) { next.delete(taskId); if (addingSubtaskFor === taskId) setAddingSubtaskFor(null) }
      else next.add(taskId)
      return next
    })
  }

  function openSubtaskForm(taskId: string) {
    setExpandedTasks(prev => new Set(prev).add(taskId))
    setAddingSubtaskFor(taskId)
    setSubtaskTitle('')
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      await createTask.mutateAsync({
        title: newTitle.trim(),
        project_id: id,
        status: 'todo',
        priority: 'p4',
        is_recurring: false,
        position: parentTasks.length,
      })
      setNewTitle('')
      addInputRef.current?.focus()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add task')
    } finally {
      setAdding(false)
    }
  }

  async function handleAddSubtask(e: React.FormEvent, parentId: string) {
    e.preventDefault()
    if (!subtaskTitle.trim()) return
    setAddingSubtask(true)
    try {
      await createTask.mutateAsync({
        title: subtaskTitle.trim(),
        project_id: id,
        parent_id: parentId,
        status: 'todo',
        priority: 'p4',
        is_recurring: false,
        position: subtaskMap[parentId]?.length ?? 0,
      })
      setSubtaskTitle('')
      subtaskInputRef.current?.focus()
    } catch {
      toast.error('Failed to add subtask')
    } finally {
      setAddingSubtask(false)
    }
  }

  async function toggleTask(task: Task) {
    const willComplete = task.status !== 'completed'
    const next = willComplete ? 'completed' : 'todo'
    await updateTask.mutateAsync({
      id: task.id,
      status: next,
      completed_at: next === 'completed' ? new Date().toISOString() : null,
    })
    if (willComplete) {
      celebrateCompletion({
        title: task.title,
        onUndo: () => {
          void updateTask.mutateAsync({
            id: task.id,
            status: 'todo',
            completed_at: null,
          })
        },
      })
    }
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
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => router.push('/projects')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{project.icon || '#'}</span>
          <h1 className="text-xl font-bold truncate">{project.name}</h1>
          {project.is_favorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
        </div>
        {totalCount > 0 && (
          <span className="text-sm text-muted-foreground flex-shrink-0">
            {completedCount}/{totalCount}
          </span>
        )}
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground ml-7 mb-4">{project.description}</p>
      )}

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="ml-7 mb-6">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border mb-4" />

      {/* Tasks */}
      {tasksLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div>
          {/* Pending tasks */}
          {pendingParents.map(task => {
            const children = subtaskMap[task.id] ?? []
            const isExpanded = expandedTasks.has(task.id)
            const completedChildren = children.filter(c => c.status === 'completed').length

            return (
              <div key={task.id}>
                {/* Parent task row */}
                <div className="flex items-start gap-2 py-1.5 px-2 group hover:bg-muted/40 rounded-lg transition-colors">
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="mt-0.5 flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <CheckCircle priority={task.priority} done={false} onToggle={() => toggleTask(task)} />
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-sm leading-snug">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                    )}
                  </div>
                  {children.length > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                      {completedChildren}/{children.length}
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                    <button
                      onClick={() => openSubtaskForm(task.id)}
                      className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      title="Add subtask"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTask.mutate(task.id)}
                      className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtasks */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-9 border-l-2 border-border pl-3 pb-1 mt-0.5">
                        {children.map(sub => (
                          <div key={sub.id} className={cn('flex items-start gap-2 py-1.5 px-2 group/sub hover:bg-muted/40 rounded-lg transition-colors', sub.status === 'completed' && 'opacity-60')}>
                            <CheckCircle priority={sub.priority} done={sub.status === 'completed'} onToggle={() => toggleTask(sub)} />
                            <p className={cn('flex-1 text-sm leading-snug min-w-0 py-0.5', sub.status === 'completed' && 'line-through text-muted-foreground')}>
                              {sub.title}
                            </p>
                            <button
                              onClick={() => deleteTask.mutate(sub.id)}
                              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover/sub:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {addingSubtaskFor === task.id ? (
                          <form
                            onSubmit={e => handleAddSubtask(e, task.id)}
                            className="flex items-center gap-2 py-1 px-2"
                          >
                            <div className="w-[18px] h-[18px] flex-shrink-0" />
                            <Input
                              ref={subtaskInputRef}
                              placeholder="Subtask name…"
                              value={subtaskTitle}
                              onChange={e => setSubtaskTitle(e.target.value)}
                              onKeyDown={e => e.key === 'Escape' && (setAddingSubtaskFor(null), setSubtaskTitle(''))}
                              className="flex-1 h-7 text-sm border-primary/40 bg-primary/5 focus-visible:ring-0"
                              autoFocus
                            />
                            <Button type="submit" size="sm" className="h-6 text-xs px-2 gradient-primary text-white border-0" disabled={addingSubtask || !subtaskTitle.trim()}>
                              {addingSubtask ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => { setAddingSubtaskFor(null); setSubtaskTitle('') }}>
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <button
                            onClick={() => openSubtaskForm(task.id)}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-1 px-2"
                          >
                            <Plus className="w-3 h-3" /> Add subtask
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}

          {/* Add task inline */}
          {showAddForm ? (
            <form onSubmit={handleAddTask} className="flex items-center gap-2 py-1.5 px-2 mt-1">
              <div className="w-4 flex-shrink-0" />
              <div className="w-[18px] h-[18px] rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
              <Input
                ref={addInputRef}
                placeholder="Task name…"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && (setShowAddForm(false), setNewTitle(''))}
                className="flex-1 h-7 text-sm border-primary/40 bg-primary/5 focus-visible:ring-0"
              />
              <Button type="submit" size="sm" className="h-6 text-xs px-2 gradient-primary text-white border-0" disabled={adding || !newTitle.trim()}>
                {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => { setShowAddForm(false); setNewTitle('') }}>
                Cancel
              </Button>
            </form>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2.5 py-1.5 text-muted-foreground hover:text-foreground group transition-colors"
              >
                <div className="w-[18px] h-[18px] rounded-full border-2 border-muted-foreground/30 flex items-center justify-center group-hover:border-primary group-hover:text-primary transition-colors flex-shrink-0">
                  <Plus className="w-2.5 h-2.5" />
                </div>
                <span className="text-sm group-hover:text-primary">Add task</span>
              </button>
              <AddSectionInline projectId={id} targetLabel="this project" />
            </div>
          )}

          {/* Completed tasks */}
          {doneParents.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowDone(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-1 transition-colors px-2"
              >
                {showDone ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Completed ({doneParents.length})
              </button>
              {showDone && doneParents.map(task => (
                <div key={task.id} className="flex items-start gap-2 py-1.5 px-2 group hover:bg-muted/40 rounded-lg transition-colors opacity-60">
                  <div className="w-4 flex-shrink-0" />
                  <CheckCircle priority={task.priority} done={true} onToggle={() => toggleTask(task)} />
                  <p className="flex-1 text-sm leading-snug line-through text-muted-foreground py-0.5">{task.title}</p>
                  <button
                    onClick={() => deleteTask.mutate(task.id)}
                    className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {parentTasks.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 px-2">No tasks yet</p>
          )}
        </div>
      )}
    </div>
  )
}
