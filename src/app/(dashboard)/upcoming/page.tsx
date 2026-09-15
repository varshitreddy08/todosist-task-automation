'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  format, addDays, startOfWeek, isSameDay, startOfDay,
} from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, Loader2,
  Pencil, Trash2, MoreHorizontal, Flag, MessageSquare,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { AddSectionInline } from '@/components/tasks/add-section-inline'
import { useCompleteWithUndo } from '@/hooks/useCompleteWithUndo'
import { toast } from 'sonner'
import type { Task } from '@/types'

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

async function patchTaskFields(id: string, patch: Partial<Task>): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

async function postTask(data: { title: string; priority: string; due_date: string }): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function sectionHeader(date: Date): string {
  const today = new Date()
  const tomorrow = addDays(today, 1)
  const d = format(date, 'd MMM')
  const wd = format(date, 'EEEE')
  if (isSameDay(date, today)) return `${d} · Today · ${wd}`
  if (isSameDay(date, tomorrow)) return `${d} · Tomorrow · ${wd}`
  return `${d} · ${wd}`
}

// ── Inline add-task (per day, pre-filled) ───────────────────────────────────
function InlineAddTask({ dueDate, onAdd, onClose }: {
  dueDate: string
  onAdd: (title: string, priority: string) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [priority, setPriority] = useState('p4')
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
    <div className="my-1.5 rounded-xl border border-border bg-background p-3 shadow-sm">
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
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {format(new Date(dueDate + 'T12:00:00'), 'd MMM')}
          </span>
          <div className="relative" ref={priorityRef}>
            <button
              type="button"
              onClick={() => setShowPriority(v => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                priority !== 'p4' ? `${selectedPriority.color} bg-muted` : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Flag className={cn('h-3.5 w-3.5', priority !== 'p4' && selectedPriority.color)} />
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

// ── Task row (with menu) ─────────────────────────────────────────────────────
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

  const priorityColor: Record<string, string> = {
    p1: 'border-red-500',
    p2: 'border-orange-400',
    p3: 'border-blue-400',
    p4: 'border-muted-foreground/40',
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5 pl-1 pr-1">
        <div className={cn('h-[18px] w-[18px] flex-shrink-0 rounded-full border-[1.5px]', priorityColor[task.priority] ?? priorityColor.p4)} />
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
    <div className={cn(
      'group flex items-center gap-2 rounded-lg py-1.5 pl-1 pr-1 transition-colors hover:bg-muted/40',
      isDone && 'opacity-50'
    )}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
        className={cn(
          'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all',
          isDone
            ? 'border-muted-foreground/40 bg-muted-foreground/40'
            : `${priorityColor[task.priority] ?? priorityColor.p4} hover:bg-red-500/10`
        )}
      >
        {isDone && (
          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          'min-w-0 flex-1 truncate text-left text-sm text-foreground',
          isDone && 'text-muted-foreground line-through'
        )}
      >
        {task.title}
      </button>

      {task.due_time && (
        <span className="text-[11px] tabular-nums text-muted-foreground">{task.due_time.slice(0, 5)}</span>
      )}

      <div className="flex flex-shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 has-[[data-open]]:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Edit"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Comment"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Task menu"
                data-open
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setEditing(true)}>
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

// ── Main Upcoming page ──────────────────────────────────────────────────────
export default function UpcomingPage() {
  const qc = useQueryClient()
  const today = useMemo(() => startOfDay(new Date()), [])

  // The "cursor" controls which month/week the strip and picker show
  const [cursor, setCursor] = useState(today)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(today.getFullYear())
  const pickerRef = useRef<HTMLDivElement>(null)

  const [addingDate, setAddingDate] = useState<string | null>(null)

  const weekStart = useMemo(() => startOfWeek(cursor, { weekStartsOn: 1 }), [cursor])
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const togglePicker = () => {
    setPickerOpen((prev) => {
      const next = !prev
      if (next) setPickerYear(cursor.getFullYear())
      return next
    })
  }

  useEffect(() => {
    if (!pickerOpen) return
    function close(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [pickerOpen])

  // Fetch today's + upcoming tasks with real-time polling
  const { data: todayTasks = [], isLoading: l1, dataUpdatedAt } = useQuery<Task[]>({
    queryKey: ['tasks', 'today'],
    queryFn: () => fetch('/api/tasks?filter=today').then(r => r.ok ? r.json() : []),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 4000,
  })
  const { data: upcomingTasks = [], isLoading: l2 } = useQuery<Task[]>({
    queryKey: ['tasks', 'upcoming'],
    queryFn: () => fetch('/api/tasks?filter=upcoming').then(r => r.ok ? r.json() : []),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 4000,
  })
  const isLoading = l1 || l2

  // Live-sync badge
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

  // Mutations
  const toggle = useMutation({
    mutationFn: patchTask,
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
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
  const create = useMutation({
    mutationFn: postTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task added')
    },
    onError: (e) => toast.error(`Could not add task: ${e instanceof Error ? e.message : String(e)}`),
  })

  // Build date→tasks map (dedup)
  const byDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of [...todayTasks, ...upcomingTasks]) {
      if (!t.due_date) continue
      map[t.due_date] ??= []
      if (!map[t.due_date].find(x => x.id === t.id)) map[t.due_date].push(t)
    }
    return map
  }, [todayTasks, upcomingTasks])

  // 30-day list from today
  const daySections = useMemo(
    () => Array.from({ length: 30 }, (_, i) => addDays(today, i)),
    [today]
  )

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
      {/* Title + live badge */}
      <div className="mb-3 flex items-center gap-2.5">
        <h1 className="text-[22px] font-bold text-foreground">Upcoming</h1>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
          title="Auto-refreshing every 8s"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {lastSync}
        </span>
      </div>

      {/* Month + week navigation */}
      <div className="relative mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={togglePicker}
          aria-expanded={pickerOpen}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold transition-colors',
            pickerOpen ? 'bg-muted text-foreground' : 'hover:bg-muted'
          )}
        >
          {format(cursor, 'MMMM yyyy')}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', pickerOpen && 'rotate-180')} />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(addDays(cursor, -7))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(today)}
            className="rounded-md px-3 py-1 text-sm font-medium hover:bg-muted"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCursor(addDays(cursor, 7))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Year + Month picker */}
        {pickerOpen && (
          <div
            ref={pickerRef}
            className="absolute left-0 top-full z-30 mt-2 w-[300px] rounded-xl border border-border bg-background p-3 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPickerYear(y => y - 1)}
                title="Previous year"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select
                value={pickerYear}
                onChange={e => setPickerYear(parseInt(e.target.value))}
                className="cursor-pointer rounded-md bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:bg-muted focus:bg-muted"
              >
                {Array.from({ length: 21 }, (_, i) => today.getFullYear() - 10 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPickerYear(y => y + 1)}
                title="Next year"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {MONTHS_SHORT.map((m, idx) => {
                const isCurrent = cursor.getFullYear() === pickerYear && cursor.getMonth() === idx
                const isThisMonth = today.getFullYear() === pickerYear && today.getMonth() === idx
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setCursor(new Date(pickerYear, idx, 1))
                      setPickerOpen(false)
                    }}
                    className={cn(
                      'rounded-md py-2 text-[12px] font-medium transition-colors',
                      isCurrent
                        ? 'bg-red-500 text-white shadow-sm hover:bg-red-600'
                        : isThisMonth
                          ? 'text-foreground ring-1 ring-red-500/50 hover:bg-muted'
                          : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
              <button
                type="button"
                onClick={() => { setCursor(today); setPickerOpen(false) }}
                className="rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Jump to today
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Week strip — clickable days */}
      <div className="mb-6 grid grid-cols-7 border-b">
        {weekDays.map((day, i) => {
          const isTodayDay = isSameDay(day, today)
          const dateStr = format(day, 'yyyy-MM-dd')
          const hasTasks = (byDate[dateStr]?.filter(t => t.status !== 'completed').length ?? 0) > 0
          const isCursorDay = isSameDay(day, cursor)
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                setCursor(day)
                const el = document.getElementById(`day-${dateStr}`)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="flex flex-col items-center gap-1 pb-3 pt-1 hover:bg-muted/40 rounded-md transition-colors"
            >
              <span className={cn(
                'text-[11px] font-medium',
                isTodayDay ? 'text-red-500' : 'text-muted-foreground'
              )}>
                {WEEK_LABELS[i]}
              </span>
              <div className={cn(
                'relative flex min-w-[28px] items-center justify-center rounded-md px-1.5 py-0.5 text-sm font-semibold',
                isTodayDay
                  ? 'bg-red-500 text-white'
                  : isCursorDay
                    ? 'bg-muted text-foreground'
                    : 'text-foreground'
              )}>
                {format(day, 'd')}
                {hasTasks && !isTodayDay && (
                  <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-500" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Day sections */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {daySections.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayTasks = (byDate[dateStr] ?? []).filter(t => t.status !== 'completed')
            const adding = addingDate === dateStr

            return (
              <section key={dateStr} id={`day-${dateStr}`}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold text-foreground">{sectionHeader(day)}</h2>
                  {dayTasks.length > 0 && (
                    <span className="text-[12px] text-muted-foreground tabular-nums">{dayTasks.length}</span>
                  )}
                  <div className="ml-1 h-px flex-1 bg-border" />
                </div>

                {/* Tasks */}
                {dayTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggle(task)}
                    onDelete={() => remove.mutate(task.id)}
                    onRename={(title) => rename.mutate({ id: task.id, title })}
                  />
                ))}

                {dayTasks.length === 0 && !adding && (
                  <p className="mb-1 px-1 py-1 text-[12px] text-muted-foreground/70">
                    Nothing scheduled.
                  </p>
                )}

                {/* Inline add or the two buttons */}
                {adding ? (
                  <InlineAddTask
                    dueDate={dateStr}
                    onAdd={(title, priority) => create.mutateAsync({ title, priority, due_date: dateStr }).then(() => {})}
                    onClose={() => setAddingDate(null)}
                  />
                ) : (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button
                      type="button"
                      onClick={() => setAddingDate(dateStr)}
                      className="inline-flex items-center gap-2 py-1.5 px-1 text-sm text-muted-foreground transition-colors hover:text-red-500 group"
                    >
                      <Plus className="h-4 w-4 flex-shrink-0 text-red-500 transition-colors" />
                      Add task
                    </button>
                    <AddSectionInline projectId={null} targetLabel="Inbox" />
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
