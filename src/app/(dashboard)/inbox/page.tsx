'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useProjects } from '@/hooks/useProjects'
import { cn } from '@/lib/utils'
import {
  ChevronRight, ChevronDown, Plus, Loader2,
  Pencil, MessageSquare, MoreHorizontal, Flag, Trash2,
} from 'lucide-react'
import { TaskDatePicker } from '@/components/shared/task-date-picker'
import type { Task } from '@/types'

const PRIORITY_OPTIONS = [
  { value: 'p1', label: 'Priority 1', color: 'text-red-500' },
  { value: 'p2', label: 'Priority 2', color: 'text-orange-400' },
  { value: 'p3', label: 'Priority 3', color: 'text-blue-400' },
  { value: 'p4', label: 'No priority', color: 'text-muted-foreground' },
]

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

async function postTask(data: { title: string; project_id?: string; priority?: string }): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

async function renameTask(id: string, title: string): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Inline add-task form ─────────────────────────────────────────────────────
const INBOX_TODAY = new Date().toISOString().split('T')[0]

function InlineAddTask({ onAdd, onClose, indent = false }: {
  onAdd: (title: string, priority: string) => Promise<void>
  onClose: () => void
  indent?: boolean
}) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [priority, setPriority] = useState('p4')
  const [dueDate, setDueDate] = useState('')
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
    try { await onAdd(title.trim(), priority); onClose() }
    finally { setBusy(false) }
  }

  const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === priority)!

  return (
    <div className={cn(
      'rounded-xl border border-border bg-background shadow-sm p-3 mb-2',
      indent && 'ml-9'
    )}>
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
        className="w-full text-sm resize-none outline-none bg-transparent placeholder:text-muted-foreground/50 leading-relaxed"
      />
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1">
          {/* Schedule — opens full calendar */}
          <TaskDatePicker value={dueDate || INBOX_TODAY} onChange={setDueDate} />

          {/* Priority picker */}
          <div className="relative" ref={priorityRef}>
            <button
              onClick={() => setShowPriority(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors',
                priority !== 'p4' ? `${selectedPriority.color} bg-muted` : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Flag className={cn('w-3.5 h-3.5', priority !== 'p4' ? selectedPriority.color : '')} />
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
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!title.trim() || busy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy && <Loader2 className="w-3 h-3 animate-spin" />}
            Add task
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Single task row ───────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete, onRename }: {
  task: Task
  onToggle: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const isDone = task.status === 'completed'
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!showMenu) return
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showMenu])

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function saveEdit() {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== task.title) onRename(trimmed)
    else setEditTitle(task.title)
    setEditing(false)
  }

  function startEdit() { setEditTitle(task.title); setEditing(true) }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2 px-1">
        <div className="w-4 flex-shrink-0" />
        <div className={cn(
          'flex-shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px]',
          isDone ? 'bg-[#ccc] border-[#ccc]' : 'border-[#ccc]'
        )} />
        <input
          ref={inputRef}
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') saveEdit()
            if (e.key === 'Escape') { setEditTitle(task.title); setEditing(false) }
          }}
          onBlur={saveEdit}
          className="flex-1 text-sm bg-transparent outline-none border-b border-[#db4c3f] text-[#202020] dark:text-foreground pb-0.5"
        />
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center gap-2 py-2 px-1 rounded-lg group hover:bg-[#f5f3f0] dark:hover:bg-muted/40 transition-colors',
      isDone && 'opacity-50'
    )}>
      {/* 6-dot drag handle — hover only */}
      <div className="w-4 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" className="text-muted-foreground/50">
          <circle cx="2" cy="2"  r="1.2"/><circle cx="8" cy="2"  r="1.2"/>
          <circle cx="2" cy="7"  r="1.2"/><circle cx="8" cy="7"  r="1.2"/>
          <circle cx="2" cy="12" r="1.2"/><circle cx="8" cy="12" r="1.2"/>
        </svg>
      </div>

      {/* Circle checkbox */}
      <button
        onClick={onToggle}
        className={cn(
          'flex-shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all',
          isDone ? 'bg-[#ccc] border-[#ccc]' : 'border-[#ccc] hover:border-[#888]'
        )}
      >
        {isDone && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Title */}
      <span className={cn(
        'flex-1 text-sm text-[#202020] dark:text-foreground min-w-0',
        isDone && 'line-through text-[#999]'
      )}>
        {task.title}
      </span>

      {/* Hover action icons */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={startEdit}
          title="Edit task"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#e8e4de] dark:hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          title="Add subtask"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#e8e4de] dark:hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="5" width="8" height="8" rx="1.5"/>
            <path d="M5 5V3.5A1.5 1.5 0 016.5 2h7A1.5 1.5 0 0115 3.5v7A1.5 1.5 0 0113.5 12H12"/>
          </svg>
        </button>
        <button
          title="Comment"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#e8e4de] dark:hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#e8e4de] dark:hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-background border border-border rounded-xl shadow-lg z-50 py-1">
              <button
                onClick={() => { startEdit(); setShowMenu(false) }}
                className="w-full text-left px-3 py-2 text-[13px] hover:bg-muted transition-colors flex items-center gap-2 text-foreground"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edit task
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => { onDelete(); setShowMenu(false) }}
                className="w-full text-left px-3 py-2 text-[13px] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-2 text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Project section ──────────────────────────────────────────────────────────
function ProjectSection({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?projectId=${projectId}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    staleTime: 30000,
  })

  const toggle = useMutation({
    mutationFn: patchTask,
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] })
      const prev = queryClient.getQueryData<Task[]>(['tasks', projectId])
      queryClient.setQueryData<Task[]>(['tasks', projectId], old =>
        old?.map(t => t.id === task.id
          ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' as const }
          : t
        ) ?? []
      )
      return { prev }
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks', projectId], ctx.prev)
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }) },
  })

  const create = useMutation({
    mutationFn: ({ title, priority }: { title: string; priority: string }) =>
      postTask({ title, project_id: projectId, priority }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] })
      const prev = queryClient.getQueryData<Task[]>(['tasks', projectId])
      queryClient.setQueryData<Task[]>(['tasks', projectId], old => old?.filter(t => t.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks', projectId], ctx.prev)
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }) },
  })

  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameTask(id, title),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] })
      const prev = queryClient.getQueryData<Task[]>(['tasks', projectId])
      queryClient.setQueryData<Task[]>(['tasks', projectId], old => old?.map(t => t.id === id ? { ...t, title } : t) ?? [])
      return { prev }
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks', projectId], ctx.prev)
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }) },
  })

  const active = tasks.filter(t => !t.parent_id && t.status !== 'completed')

  if (isLoading) {
    return (
      <div className="py-3 flex items-center gap-3">
        <div className="w-3 h-3 rounded bg-muted animate-pulse" />
        <div className="w-32 h-3.5 rounded bg-muted animate-pulse" />
        <div className="flex-1 h-px bg-border" />
      </div>
    )
  }

  return (
    <div className="mb-5">
      {/* ── Section header ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 py-2 cursor-pointer select-none group/header"
        onClick={() => setCollapsed(v => !v)}
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5 text-[#808080] flex-shrink-0" />
          : <ChevronDown  className="w-3.5 h-3.5 text-[#808080] flex-shrink-0" />}

        <span className="text-[14px] font-bold text-[#202020] dark:text-foreground">
          {projectName}
        </span>

        {active.length > 0 && (
          <span className="text-[14px] text-[#808080] font-normal">{active.length}</span>
        )}

        {/* Full-width divider line — fills space between count and ··· */}
        <div className="flex-1 h-px bg-[#f0ede8] dark:bg-border mx-1" />

        {/* ··· menu button */}
        <button
          onClick={e => e.stopPropagation()}
          className="text-[#aaa] hover:text-[#555] dark:hover:text-foreground transition-colors opacity-0 group-hover/header:opacity-100 w-6 h-6 flex items-center justify-center rounded flex-shrink-0"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* ── Tasks + Add task ────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="pl-5">
          {active.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => toggle.mutate(task)}
              onDelete={() => remove.mutate(task.id)}
              onRename={(title) => rename.mutate({ id: task.id, title })}
            />
          ))}

          {addingTask ? (
            <InlineAddTask
              indent
              onAdd={(title, priority) => create.mutateAsync({ title, priority }).then(() => {})}
              onClose={() => setAddingTask(false)}
            />
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="flex items-center gap-2 py-1.5 px-1 text-[13px] text-[#db4c3f] hover:text-[#b0382d] transition-colors group/add mt-0.5"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              Add task
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main inbox page ──────────────────────────────────────────────────────────
export default function InboxPage() {
  const queryClient = useQueryClient()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const [addingTask, setAddingTask] = useState(false)

  const { data: inboxTasks = [], isLoading: inboxLoading } = useQuery<Task[]>({
    queryKey: ['tasks', 'inbox'],
    queryFn: async () => {
      const res = await fetch('/api/tasks')
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    staleTime: 30000,
  })

  const toggleInbox = useMutation({
    mutationFn: patchTask,
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'inbox'] })
      const prev = queryClient.getQueryData<Task[]>(['tasks', 'inbox'])
      queryClient.setQueryData<Task[]>(['tasks', 'inbox'], old =>
        old?.map(t => t.id === task.id
          ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' as const }
          : t
        ) ?? []
      )
      return { prev }
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks', 'inbox'], ctx.prev)
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }) },
  })

  const createInboxTask = useMutation({
    mutationFn: ({ title, priority }: { title: string; priority: string }) => postTask({ title, priority }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', 'inbox'] }),
  })

  const removeInboxTask = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'inbox'] })
      const prev = queryClient.getQueryData<Task[]>(['tasks', 'inbox'])
      queryClient.setQueryData<Task[]>(['tasks', 'inbox'], old => old?.filter(t => t.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks', 'inbox'], ctx.prev)
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }) },
  })

  const renameInboxTask = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameTask(id, title),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'inbox'] })
      const prev = queryClient.getQueryData<Task[]>(['tasks', 'inbox'])
      queryClient.setQueryData<Task[]>(['tasks', 'inbox'], old => old?.map(t => t.id === id ? { ...t, title } : t) ?? [])
      return { prev }
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks', 'inbox'], ctx.prev)
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['tasks', 'inbox'] }) },
  })

  const activeInbox = inboxTasks.filter(t => t.status !== 'completed')

  if (inboxLoading && projectsLoading) {
    return (
      <div className="max-w-3xl mx-auto px-12 py-10">
        <h1 className="text-[22px] font-bold text-[#202020] dark:text-foreground mb-4">Inbox</h1>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-12 py-10">

      {/* Title */}
      <h1 className="text-[22px] font-bold text-[#202020] dark:text-foreground mb-1">
        Inbox
      </h1>

      {/* Unassigned inbox tasks */}
      {activeInbox.length > 0 && (
        <div className="mb-1">
          {activeInbox.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => toggleInbox.mutate(task)}
              onDelete={() => removeInboxTask.mutate(task.id)}
              onRename={(title) => renameInboxTask.mutate({ id: task.id, title })}
            />
          ))}
        </div>
      )}

      {/* Top-level + Add task */}
      {addingTask ? (
        <div className="mt-1 mb-4">
          <InlineAddTask
            onAdd={(title, priority) => createInboxTask.mutateAsync({ title, priority }).then(() => {})}
            onClose={() => setAddingTask(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setAddingTask(true)}
          className="flex items-center gap-2 py-1.5 px-1 text-[13px] text-muted-foreground hover:text-[#db4c3f] transition-colors group mb-6"
        >
          <Plus className="w-4 h-4 flex-shrink-0 text-[#db4c3f]" />
          Add task
        </button>
      )}

      {/* Project sections */}
      {projects.map(project => (
        <ProjectSection
          key={project.id}
          projectId={project.id}
          projectName={project.name}
        />
      ))}

      {/* Empty projects prompt */}
      {!projectsLoading && projects.length === 0 && (
        <div className="mt-4 flex items-center gap-2 py-2">
          <div className="flex-1 h-px bg-[#f0ede8] dark:bg-border" />
          <Link
            href="/projects"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#808080] hover:text-[#db4c3f] rounded-lg hover:bg-[#f5f3f0] dark:hover:bg-muted/40 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 flex-shrink-0" />
            Add a project to see it here
          </Link>
          <div className="flex-1 h-px bg-[#f0ede8] dark:bg-border" />
        </div>
      )}

    </div>
  )
}
