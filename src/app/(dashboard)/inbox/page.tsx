'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useProjects } from '@/hooks/useProjects'
import { useSections, useCreateSection, useRenameSection, useDeleteSection, SectionsApiError, type Section } from '@/hooks/useSections'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import {
  ChevronRight, ChevronDown, Plus, Loader2,
  Pencil, MessageSquare, MoreHorizontal, Flag, Trash2,
  Calendar as CalendarIcon, History, Search, SortAsc, MoreVertical,
  ExternalLink, PenLine, FolderPlus, Layers, List, Columns,
} from 'lucide-react'
import { BoardView, type BoardColumnData } from '@/components/tasks/board-view'
import { useCompleteWithUndo } from '@/hooks/useCompleteWithUndo'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { TaskDatePicker } from '@/components/shared/task-date-picker'
import { CalendarSidePanel } from '@/components/tasks/calendar-side-panel'
import { HistorySidePanel } from '@/components/tasks/history-side-panel'
import type { Task } from '@/types'
import { toast } from 'sonner'

const PRIORITY_OPTIONS = [
  { value: 'p1', label: 'Priority 1', color: 'text-red-500' },
  { value: 'p2', label: 'Priority 2', color: 'text-orange-400' },
  { value: 'p3', label: 'Priority 3', color: 'text-blue-400' },
  { value: 'p4', label: 'No priority', color: 'text-muted-foreground' },
]

// ── API helpers ──────────────────────────────────────────────────────────────
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

async function postTask(data: {
  title: string
  project_id?: string | null
  section_id?: string | null
  priority?: string
}): Promise<Task> {
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

async function patchTaskFields(id: string, patch: Partial<Task>): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Icon-only button (consistent 28px hit area) ─────────────────────────────
function IconBtn({
  onClick, title, children, active, className,
}: {
  onClick?: () => void
  title?: string
  children: React.ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground/70 hover:bg-muted hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  )
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
      'my-1.5 rounded-xl border border-border bg-background p-3 shadow-sm',
      indent && 'ml-6'
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
        className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
      />
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <div className="flex items-center gap-1">
          <TaskDatePicker value={dueDate || INBOX_TODAY} onChange={setDueDate} />
          <div className="relative" ref={priorityRef}>
            <button
              type="button"
              onClick={() => setShowPriority(v => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                priority !== 'p4' ? `${selectedPriority.color} bg-muted` : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Flag className={cn('h-3.5 w-3.5', priority !== 'p4' ? selectedPriority.color : '')} />
              {priority !== 'p4' ? selectedPriority.label : 'Priority'}
            </button>
            {showPriority && (
              <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-xl border border-border bg-background py-1 shadow-lg">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setPriority(opt.value); setShowPriority(false) }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors hover:bg-muted',
                      opt.value === priority ? 'font-semibold' : ''
                    )}
                  >
                    <Flag className={cn('h-3.5 w-3.5', opt.color)} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || busy}
            className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            Add task
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inline "Add section" ────────────────────────────────────────────────────
function InlineAddSection({ onAdd, onClose }: {
  onAdd: (name: string) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  async function submit() {
    if (!name.trim() || busy) return
    setBusy(true)
    try { await onAdd(name.trim()); onClose() }
    finally { setBusy(false) }
  }

  return (
    <div className="my-2.5 flex items-center gap-2 rounded-lg border border-red-500/40 bg-background p-2.5 shadow-sm">
      <Layers className="h-4 w-4 flex-shrink-0 text-red-500" />
      <input
        ref={ref}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); submit() }
          if (e.key === 'Escape') onClose()
        }}
        placeholder="Name this section"
        className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
      />
      <button
        type="button"
        onClick={onClose}
        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim() || busy}
        className="flex items-center gap-1 rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-40"
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
        Add section
      </button>
    </div>
  )
}

// ── Hover-reveal Add-section separator ──────────────────────────────────────
function AddSectionSeparator({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/sep relative my-2 flex h-6 w-full items-center"
      aria-label="Add section"
    >
      <div className="pointer-events-none flex w-full items-center opacity-0 transition-opacity group-hover/sep:opacity-100">
        <div className="h-px flex-1 bg-red-500/40" />
        <span className="mx-2 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-500">
          <Plus className="h-3 w-3" /> Add section
        </span>
        <div className="h-px flex-1 bg-red-500/40" />
      </div>
    </button>
  )
}

// ── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete, onRename }: {
  task: Task
  onToggle: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const isDone = task.status === 'completed'
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

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
      <div className="flex items-center gap-2 py-1.5 pl-1 pr-1">
        <div className="h-[18px] w-[18px] flex-shrink-0 rounded-full border-[1.5px] border-muted-foreground/40" />
        <input
          ref={inputRef}
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') saveEdit()
            if (e.key === 'Escape') { setEditTitle(task.title); setEditing(false) }
          }}
          onBlur={saveEdit}
          className="min-w-0 flex-1 border-b border-red-500 bg-transparent pb-0.5 text-sm text-foreground outline-none"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg py-1.5 pl-1 pr-1 transition-colors hover:bg-muted/40',
        isDone && 'opacity-50'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
        className={cn(
          'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all',
          isDone
            ? 'border-muted-foreground/40 bg-muted-foreground/40'
            : 'border-muted-foreground/40 hover:border-red-500 hover:bg-red-500/10'
        )}
      >
        {isDone && (
          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={startEdit}
        className={cn(
          'min-w-0 flex-1 truncate text-left text-sm text-foreground',
          isDone && 'text-muted-foreground line-through'
        )}
      >
        {task.title}
      </button>

      <div className="flex flex-shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 has-[[data-open]]:opacity-100">
        <IconBtn title="Edit task" onClick={startEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn title="Comment">
          <MessageSquare className="h-3.5 w-3.5" />
        </IconBtn>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Task menu"
                data-open
                className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={startEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit task
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ── Reusable header row (used by sections and projects) ─────────────────────
function HeaderRow({
  collapsed, onToggleCollapse, title, count, editing, editInput,
  onAddTask, menu,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
  title: React.ReactNode
  count?: number
  editing?: boolean
  editInput?: React.ReactNode
  onAddTask: () => void
  menu: React.ReactNode
}) {
  return (
    <div className="group/header flex select-none items-center gap-2 py-2 pl-0.5 pr-1">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
        aria-label={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {editing ? (
        editInput
      ) : (
        <>
          <span className="text-[14px] font-bold text-foreground">{title}</span>
          {typeof count === 'number' && count > 0 && (
            <span className="text-[13px] font-normal text-muted-foreground">{count}</span>
          )}
        </>
      )}

      <div className="mx-1 h-px flex-1 bg-border" />

      <div className="flex flex-shrink-0 items-center opacity-0 transition-opacity group-hover/header:opacity-100 has-[[data-open]]:opacity-100">
        <IconBtn title="Add task" onClick={onAddTask}>
          <Plus className="h-3.5 w-3.5" />
        </IconBtn>
        {menu}
      </div>
    </div>
  )
}

// ── Section block ────────────────────────────────────────────────────────────
function SectionBlock({
  section, tasksInSection, projectId, onDeleted, onRenamed,
}: {
  section: Section
  tasksInSection: Task[]
  projectId: string | null
  onDeleted: () => void
  onRenamed: () => void
}) {
  const qc = useQueryClient()
  const [collapsed, setCollapsed] = useState(section.is_collapsed)
  const [addingTask, setAddingTask] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(section.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const renameMutation = useRenameSection()
  const deleteMutation = useDeleteSection()

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function commitRename() {
    const name = editName.trim()
    setEditing(false)
    if (!name || name === section.name) { setEditName(section.name); return }
    try {
      await renameMutation.mutateAsync({ id: section.id, name })
      onRenamed()
    } catch (e) {
      toast.error(`Rename failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete section "${section.name}"? Tasks inside will move to the parent view.`)) return
    try {
      await deleteMutation.mutateAsync(section.id)
      toast.success('Section deleted')
      onDeleted()
    } catch (e) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  async function toggleCollapse() {
    setCollapsed(v => !v)
    try {
      await fetch(`/api/sections/${section.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_collapsed: !collapsed }),
      })
    } catch { /* ignore, UI already updated */ }
  }

  const active = tasksInSection.filter(t => t.status !== 'completed')

  const toggle = useMutation({
    mutationFn: patchTask,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })
  const handleToggle = useCompleteWithUndo(toggle.mutate)
  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => patchTaskFields(id, { title }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  return (
    <div className="my-2">
      <HeaderRow
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        title={section.name}
        count={active.length}
        editing={editing}
        editInput={
          <input
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setEditName(section.name); setEditing(false) }
            }}
            onBlur={commitRename}
            className="min-w-0 border-b border-red-500 bg-transparent text-[14px] font-bold text-foreground outline-none"
          />
        }
        onAddTask={() => { setAddingTask(true); setCollapsed(false) }}
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Section menu"
                  data-open
                  className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => { setAddingTask(true); setCollapsed(false) }}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Add task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <PenLine className="mr-2 h-3.5 w-3.5" /> Rename section
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleCollapse}>
                {collapsed
                  ? <ChevronDown className="mr-2 h-3.5 w-3.5" />
                  : <ChevronRight className="mr-2 h-3.5 w-3.5" />}
                {collapsed ? 'Expand' : 'Collapse'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {!collapsed && (
        <div className="pl-6">
          {active.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => handleToggle(task)}
              onDelete={() => remove.mutate(task.id)}
              onRename={(title) => rename.mutate({ id: task.id, title })}
            />
          ))}
          {addingTask ? (
            <InlineAddTask
              onAdd={async (title, priority) => {
                await postTask({ title, project_id: projectId, section_id: section.id, priority })
                qc.invalidateQueries({ queryKey: ['tasks'] })
              }}
              onClose={() => setAddingTask(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingTask(true)}
              className="mt-0.5 flex items-center gap-2 px-1 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-red-500"
            >
              <Plus className="h-4 w-4 text-red-500" /> Add task
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Project section (a project rendered inside the inbox) ───────────────────
function ProjectSection({ projectId, projectName, filter }: {
  projectId: string
  projectName: string
  filter: string
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?projectId=${projectId}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    refetchInterval: 10000,
    staleTime: 5000,
  })
  const { data: sections = [] } = useSections(projectId)
  const createSection = useCreateSection()

  const toggle = useMutation({
    mutationFn: patchTask,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
  const handleToggle = useCompleteWithUndo(toggle.mutate)
  const create = useMutation({
    mutationFn: ({ title, priority }: { title: string; priority: string }) =>
      postTask({ title, project_id: projectId, priority }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => patchTaskFields(id, { title }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })

  const q = filter.trim().toLowerCase()
  const filterFn = (t: Task) => !q || t.title.toLowerCase().includes(q)

  const unSectioned = tasks
    .filter(t => !t.parent_id && !t.section_id && t.status !== 'completed')
    .filter(filterFn)

  const bySection: Record<string, Task[]> = {}
  for (const t of tasks) {
    if (t.section_id && !t.parent_id && filterFn(t)) {
      (bySection[t.section_id] ??= []).push(t)
    }
  }

  const activeCount = tasks.filter(t => !t.parent_id && t.status !== 'completed' && filterFn(t)).length

  async function handleAddSection(name: string) {
    try {
      await createSection.mutateAsync({ name, project_id: projectId })
      toast.success('Section added')
    } catch (e) {
      if (e instanceof SectionsApiError && e.code === 'MISSING_TABLE') {
        toast.error('Run `npm run db:push` — the sections table is missing.', { duration: 8000 })
      } else if (e instanceof SectionsApiError) {
        toast.error(e.message, { duration: 8000 })
      } else {
        toast.error(`Could not create section: ${e instanceof Error ? e.message : String(e)}`, { duration: 8000 })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="h-3 w-3 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-px flex-1 bg-border" />
      </div>
    )
  }

  if (q && activeCount === 0 && sections.every(s => (bySection[s.id]?.length ?? 0) === 0)) return null

  return (
    <div className="mb-4">
      <HeaderRow
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(v => !v)}
        title={
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-red-500"
            onClick={e => e.stopPropagation()}
          >
            {projectName}
          </Link>
        }
        count={activeCount}
        onAddTask={() => { setAddingTask(true); setCollapsed(false) }}
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Project menu"
                  data-open
                  className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => { setAddingTask(true); setCollapsed(false) }}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Add task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setAddingSection(true); setCollapsed(false) }}>
                <FolderPlus className="mr-2 h-3.5 w-3.5" /> Add section
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.assign(`/projects/${projectId}`)}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCollapsed(v => !v)}>
                {collapsed
                  ? <ChevronDown className="mr-2 h-3.5 w-3.5" />
                  : <ChevronRight className="mr-2 h-3.5 w-3.5" />}
                {collapsed ? 'Expand' : 'Collapse'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {!collapsed && (
        <div className="pl-6">
          {unSectioned.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => handleToggle(task)}
              onDelete={() => remove.mutate(task.id)}
              onRename={(title) => rename.mutate({ id: task.id, title })}
            />
          ))}

          {addingTask ? (
            <InlineAddTask
              onAdd={(title, priority) => create.mutateAsync({ title, priority }).then(() => {})}
              onClose={() => setAddingTask(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingTask(true)}
              className="mt-0.5 flex items-center gap-2 px-1 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-red-500"
            >
              <Plus className="h-4 w-4 text-red-500" /> Add task
            </button>
          )}

          {sections.map((s) => (
            <SectionBlock
              key={s.id}
              section={s}
              tasksInSection={bySection[s.id] ?? []}
              projectId={projectId}
              onDeleted={() => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })}
              onRenamed={() => queryClient.invalidateQueries({ queryKey: ['sections', projectId] })}
            />
          ))}

          {addingSection ? (
            <InlineAddSection onAdd={handleAddSection} onClose={() => setAddingSection(false)} />
          ) : (
            <AddSectionSeparator onClick={() => setAddingSection(true)} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Main inbox page ──────────────────────────────────────────────────────────
const VIEW_KEY = 'inbox.view'

export default function InboxPage() {
  const queryClient = useQueryClient()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const [addingTask, setAddingTask] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [view, setView] = useState<'list' | 'board'>('list')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === 'board' || stored === 'list') setView(stored)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view) } catch { /* ignore */ }
  }, [view])

  const setQuickAddOpen = useAppStore(s => s.setQuickAddOpen)

  const { data: inboxTasks = [], isLoading: inboxLoading, dataUpdatedAt } = useQuery<Task[]>({
    queryKey: ['tasks', 'inbox'],
    queryFn: async () => {
      const res = await fetch('/api/tasks')
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 4000,
  })

  const { data: inboxSections = [] } = useSections(null)
  const createSection = useCreateSection()

  const toggleInbox = useMutation({
    mutationFn: patchTask,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
  const handleToggleInbox = useCompleteWithUndo(toggleInbox.mutate)
  const createInboxTask = useMutation({
    mutationFn: ({ title, priority }: { title: string; priority: string }) =>
      postTask({ title, priority }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', 'inbox'] }),
  })
  const removeInboxTask = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const renameInboxTask = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => patchTaskFields(id, { title }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks', 'inbox'] }),
  })

  const q = filter.trim().toLowerCase()

  const unSectionedInbox = useMemo(
    () => inboxTasks.filter(
      t => !t.section_id && !t.parent_id && t.status !== 'completed'
        && (!q || t.title.toLowerCase().includes(q))
    ),
    [inboxTasks, q]
  )
  const tasksBySection = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of inboxTasks) {
      const matchesFilter = !q || t.title.toLowerCase().includes(q)
      if (t.section_id && !t.parent_id && matchesFilter) {
        (map[t.section_id] ??= []).push(t)
      }
    }
    return map
  }, [inboxTasks, q])

  const totalActive = inboxTasks.filter(t => t.status !== 'completed').length

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])
  const lastSync = useMemo(() => {
    if (!dataUpdatedAt) return 'syncing…'
    const secs = Math.max(0, Math.floor((now - dataUpdatedAt) / 1000))
    return secs < 5 ? 'live' : `synced ${secs}s ago`
  }, [dataUpdatedAt, now])

  async function handleAddInboxSection(name: string) {
    try {
      await createSection.mutateAsync({ name, project_id: null })
      toast.success('Section added')
    } catch (e) {
      if (e instanceof SectionsApiError && e.code === 'MISSING_TABLE') {
        toast.error('Run `npm run db:push` — the sections table is missing.', { duration: 8000 })
      } else if (e instanceof SectionsApiError) {
        toast.error(e.message, { duration: 8000 })
      } else {
        toast.error(`Could not create section: ${e instanceof Error ? e.message : String(e)}`, { duration: 8000 })
      }
    }
  }

  return (
    <div className="relative">
      <div className={cn(
        'mx-auto px-6 py-8 lg:px-10 transition-[max-width]',
        view === 'board' ? 'max-w-[1400px]' : 'max-w-3xl'
      )}>
        {/* ── Header ── */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="text-[22px] font-bold text-foreground">Inbox</h1>
              {totalActive > 0 && (
                <span className="text-sm text-muted-foreground tabular-nums">{totalActive}</span>
              )}
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                title="Auto-refreshing every 8s"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {lastSync}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* View toggle */}
              <div className="mr-1 flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  title="List view"
                  aria-label="List view"
                  className={cn(
                    'inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors',
                    view === 'list'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setView('board')}
                  title="Board view"
                  aria-label="Board view"
                  className={cn(
                    'inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors',
                    view === 'board'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Columns className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Board</span>
                </button>
              </div>
              <IconBtn title="Completed history" onClick={() => setHistoryOpen(true)}>
                <History className="h-4 w-4" />
              </IconBtn>
              <IconBtn title="Open calendar" onClick={() => setCalendarOpen(true)}>
                <CalendarIcon className="h-4 w-4" />
              </IconBtn>
              <IconBtn title="Sort">
                <SortAsc className="h-4 w-4" />
              </IconBtn>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      aria-label="View menu"
                      data-open
                      className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  }
                />
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setQuickAddOpen(true)}>
                    <Plus className="mr-2 h-3.5 w-3.5" /> Quick add task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAddingSection(true)}>
                    <FolderPlus className="mr-2 h-3.5 w-3.5" /> Add section
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCalendarOpen(true)}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" /> Open calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                    <History className="mr-2 h-3.5 w-3.5" /> Completed history
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Capture what&apos;s on your mind. Organize it later.
          </p>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter tasks in this view · or press Ctrl+K for global search"
              className="h-9 w-full rounded-lg border border-border bg-muted/30 pl-9 pr-20 text-[13px] outline-none placeholder:text-muted-foreground/70 focus:border-red-500/40 focus:bg-background"
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                  e.preventDefault()
                  ;(window as unknown as { __openCommandPalette?: () => void }).__openCommandPalette?.()
                }
              }}
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Ctrl+K
            </kbd>
          </div>
        </header>

        {/* ── Body ── */}
        {inboxLoading && projectsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {view === 'list' && unSectionedInbox.length === 0 && inboxSections.length === 0 && !q && !addingTask && !addingSection && (
              <div className="mb-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-background shadow-sm">
                  <Plus className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-sm font-medium">Your inbox is clear</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a task or a section to get started.
                </p>
                <div className="mt-4 inline-flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAddingTask(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-medium text-white hover:bg-red-600"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add task
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingSection(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <FolderPlus className="h-3.5 w-3.5" /> Add section
                  </button>
                </div>
              </div>
            )}

            {view === 'board' && (() => {
              const columns: BoardColumnData[] = []
              if (unSectionedInbox.length > 0 || inboxSections.length === 0) {
                columns.push({
                  key: 'default',
                  section: null,
                  title: 'Inbox',
                  tasks: unSectionedInbox,
                  projectId: null,
                })
              }
              inboxSections.forEach((s) => {
                columns.push({
                  key: s.id,
                  section: s,
                  title: s.name,
                  tasks: tasksBySection[s.id] ?? [],
                  projectId: null,
                })
              })
              return (
                <BoardView
                  columns={columns}
                  projectId={null}
                  onColumnChanged={() => {
                    queryClient.invalidateQueries({ queryKey: ['sections', 'inbox'] })
                    queryClient.invalidateQueries({ queryKey: ['tasks'] })
                  }}
                />
              )
            })()}

            {/* Top-level (un-sectioned) inbox tasks */}
            {view === 'list' && (<>

            {unSectionedInbox.length > 0 && (
              <div>
                {unSectionedInbox.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggleInbox(task)}
                    onDelete={() => removeInboxTask.mutate(task.id)}
                    onRename={(title) => renameInboxTask.mutate({ id: task.id, title })}
                  />
                ))}
              </div>
            )}

            {addingTask ? (
              <InlineAddTask
                onAdd={(title, priority) =>
                  createInboxTask.mutateAsync({ title, priority }).then(() => {})
                }
                onClose={() => setAddingTask(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingTask(true)}
                className="mt-0.5 flex items-center gap-2 px-1 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-red-500"
              >
                <Plus className="h-4 w-4 flex-shrink-0 text-red-500" /> Add task
              </button>
            )}

            {/* Inbox-level sections */}
            {inboxSections.map((s) => (
              <SectionBlock
                key={s.id}
                section={s}
                tasksInSection={tasksBySection[s.id] ?? []}
                projectId={null}
                onDeleted={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
                onRenamed={() => queryClient.invalidateQueries({ queryKey: ['sections', 'inbox'] })}
              />
            ))}

            {addingSection ? (
              <InlineAddSection
                onAdd={handleAddInboxSection}
                onClose={() => setAddingSection(false)}
              />
            ) : (
              <AddSectionSeparator onClick={() => setAddingSection(true)} />
            )}

            {/* Project sections */}
            {projects.map(project => (
              <ProjectSection
                key={project.id}
                projectId={project.id}
                projectName={project.name}
                filter={filter}
              />
            ))}

            {!projectsLoading && projects.length === 0 && (
              <div className="mt-4 flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-border" />
                <Link
                  href="/projects"
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-red-500"
                >
                  <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                  Add a project to see it here
                </Link>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            </>)}
          </>
        )}
      </div>

      <CalendarSidePanel open={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <HistorySidePanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  )
}
