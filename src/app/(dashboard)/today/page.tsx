'use client'
import { useState, useRef, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Flame, ChevronDown, ChevronRight, Plus, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskDatePicker } from '@/components/shared/task-date-picker'
import type { Task } from '@/types'

const TODAY = new Date().toISOString().split('T')[0]

const PRIORITY_OPTIONS = [
  { value: 'p1', label: 'Priority 1', color: 'text-red-500' },
  { value: 'p2', label: 'Priority 2', color: 'text-orange-400' },
  { value: 'p3', label: 'Priority 3', color: 'text-blue-400' },
  { value: 'p4', label: 'No priority', color: 'text-muted-foreground' },
]

// ── Priority classes (same as shared task-row) ───────────────────────────────
const IDLE: Record<string, string> = {
  p1: 'border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
  p2: 'border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30',
  p3: 'border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30',
  p4: 'border-muted-foreground/30 hover:bg-muted/50',
}
const DONE: Record<string, string> = {
  p1: 'bg-red-500 border-red-500',
  p2: 'bg-orange-400 border-orange-400',
  p3: 'bg-blue-400 border-blue-400',
  p4: 'bg-muted-foreground/30 border-muted-foreground/30',
}

// ── API ──────────────────────────────────────────────────────────────────────
async function patchTask(task: Task): Promise<Task> {
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
}

async function createTask(title: string, priority: string, dueDate: string): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, due_date: dueDate, priority }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Inline add-task form ─────────────────────────────────────────────────────
function InlineAddTask({ onAdd, onClose }: {
  onAdd: (title: string, priority: string, dueDate: string) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [priority, setPriority] = useState('p4')
  const [dueDate, setDueDate] = useState(TODAY)
  const [showPriority, setShowPriority] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const priorityRef = useRef<HTMLDivElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setShowPriority(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function submit() {
    if (!title.trim() || busy) return
    setBusy(true)
    try { await onAdd(title.trim(), priority, dueDate); onClose() }
    finally { setBusy(false) }
  }

  const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === priority)!

  return (
    <div className="border border-border rounded-xl p-3 mt-1 mb-2 bg-background shadow-sm">
      <textarea
        ref={ref}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
          if (e.key === 'Escape') onClose()
        }}
        placeholder="Task name"
        rows={1}
        className="w-full text-sm resize-none outline-none bg-transparent placeholder:text-muted-foreground/60 min-h-[24px]"
      />
      {/* Toolbar */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <div className="flex items-center gap-1">
          {/* Date picker — opens full calendar */}
          <TaskDatePicker value={dueDate} onChange={setDueDate} />

          {/* Priority picker */}
          <div className="relative" ref={priorityRef}>
            <button
              onClick={() => setShowPriority(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors',
                priority !== 'p4'
                  ? `${selectedPriority.color} bg-muted`
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Flag className={cn('w-3.5 h-3.5', priority !== 'p4' && selectedPriority.color)} />
              {priority !== 'p4' ? selectedPriority.label : 'Priority'}
            </button>
            {showPriority && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-background border border-border rounded-xl shadow-lg z-50 py-1">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setPriority(opt.value); setShowPriority(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-[12px] hover:bg-muted transition-colors flex items-center gap-2.5',
                      opt.value === priority ? 'font-semibold' : ''
                    )}
                  >
                    <Flag className={cn('w-3.5 h-3.5', opt.color)} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!title.trim() || busy}
            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3 h-3 animate-spin" />}
            Add task
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Task row ─────────────────────────────────────────────────────────────────
function TodayTaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const isDone = task.status === 'completed'
  const p = (task.priority ?? 'p4') as keyof typeof IDLE

  return (
    <div className={cn(
      'flex items-center gap-3 py-[7px] px-2 rounded-lg hover:bg-muted/40 transition-colors group',
      isDone && 'opacity-50'
    )}>
      <button
        onClick={onToggle}
        className={cn(
          'flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all',
          isDone ? (DONE[p] ?? DONE.p4) : (IDLE[p] ?? IDLE.p4)
        )}
      >
        {isDone && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className={cn('flex-1 text-sm', isDone && 'line-through text-muted-foreground')}>
        {task.title}
      </span>
      {task.due_time && (
        <span className="text-xs text-muted-foreground flex-shrink-0">{task.due_time}</span>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TodayPage() {
  const queryClient = useQueryClient()
  const [showDone, setShowDone] = useState(false)
  const [addingTask, setAddingTask] = useState(false)

  // Streak
  const { data: streak = 0 } = useQuery({
    queryKey: ['streak'],
    queryFn: async () => {
      const res = await fetch('/api/tasks?filter=streak')
      const data: { completed_at: string | null }[] = res.ok ? await res.json() : []
      if (!data.length) return 0
      const doneDates = new Set(data.filter(t => t.completed_at).map(t => t.completed_at!.split('T')[0]))
      let count = 0
      let check = new Date()
      if (!doneDates.has(format(check, 'yyyy-MM-dd'))) check = addDays(check, -1)
      while (doneDates.has(format(check, 'yyyy-MM-dd'))) { count++; check = addDays(check, -1) }
      return count
    },
    refetchInterval: 60000,
  })

  // Today tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', 'today'],
    queryFn: async () => {
      const res = await fetch('/api/tasks?filter=today')
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    staleTime: 10000,
  })

  // Toggle complete — optimistic
  const toggle = useMutation({
    mutationFn: patchTask,
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'today'] })
      const prev = queryClient.getQueryData<Task[]>(['tasks', 'today'])
      queryClient.setQueryData<Task[]>(['tasks', 'today'], old =>
        old?.map(t => t.id === task.id
          ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' as const }
          : t
        ) ?? []
      )
      return { prev }
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks', 'today'], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['streak'] })
    },
  })

  // Create task — optimistic insert so it appears instantly
  const create = useMutation({
    mutationFn: ({ title, priority, dueDate }: { title: string; priority: string; dueDate: string }) =>
      createTask(title, priority, dueDate),
    onMutate: async ({ title, priority, dueDate }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'today'] })
      const prev = queryClient.getQueryData<Task[]>(['tasks', 'today'])
      const optimistic: Task = {
        id: `temp-${Date.now()}`,
        title,
        status: 'todo',
        priority: priority as Task['priority'],
        due_date: dueDate,
        due_time: null,
        description: null,
        project_id: null,
        parent_id: null,
        section_id: null,
        is_recurring: false,
        recurrence_rule: null,
        assigned_to: null,
        created_by: '',
        position: 0,
        estimated_minutes: null,
        actual_minutes: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Task
      queryClient.setQueryData<Task[]>(['tasks', 'today'], old => [...(old ?? []), optimistic])
      return { prev }
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks', 'today'], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'inbox'] })
    },
  })

  const pending = tasks.filter(t => t.status !== 'completed')
  const done = tasks.filter(t => t.status === 'completed')

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, d MMMM')}</p>
        </div>
        {streak > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-orange-500 font-medium">
            <Flame className="w-4 h-4" /> {streak}-day streak
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div>
          {/* Pending tasks */}
          {pending.map(task => (
            <TodayTaskRow key={task.id} task={task} onToggle={() => toggle.mutate(task)} />
          ))}

          {/* Inline add form or + Add task button */}
          {addingTask ? (
            <InlineAddTask
              onAdd={async (title, priority, dueDate) => { await create.mutateAsync({ title, priority, dueDate }) }}
              onClose={() => setAddingTask(false)}
            />
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="flex items-center gap-2 py-1.5 px-2 text-sm text-muted-foreground hover:text-red-500 transition-colors group mt-1"
            >
              <Plus className="w-4 h-4 group-hover:text-red-500 transition-colors flex-shrink-0" />
              Add task
            </button>
          )}

          {/* Completed section */}
          {done.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowDone(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-1 transition-colors px-2"
              >
                {showDone
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />}
                Completed ({done.length})
              </button>
              {showDone && done.map(task => (
                <TodayTaskRow key={task.id} task={task} onToggle={() => toggle.mutate(task)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
