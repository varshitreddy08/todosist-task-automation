'use client'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import {
  Plus, MoreHorizontal,
  Pencil, Trash2, Loader2, Layers, FolderPlus,
  Copy, PenLine, CalendarRange, Inbox,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Task } from '@/types'
import {
  useCreateSection, useRenameSection, useDeleteSection, SectionsApiError,
  type Section,
} from '@/hooks/useSections'
import { useCompleteWithUndo } from '@/hooks/useCompleteWithUndo'

// ── API helpers (local copies to keep this component standalone) ─────────────
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

const priorityBar: Record<string, string> = {
  p1: 'bg-red-500',
  p2: 'bg-orange-400',
  p3: 'bg-blue-400',
  p4: 'bg-transparent',
}

function dueLabel(iso: string | null): { text: string; cls: string } | null {
  if (!iso) return null
  const d = parseISO(iso)
  if (isToday(d)) return { text: 'Today', cls: 'text-emerald-600 dark:text-emerald-400' }
  if (isTomorrow(d)) return { text: 'Tomorrow', cls: 'text-orange-500 dark:text-orange-400' }
  return { text: format(d, 'd MMM'), cls: 'text-muted-foreground' }
}

// ── Task card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle, onDelete, onRename }: {
  task: Task
  onToggle: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const isDone = task.status === 'completed'
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(task.title)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const due = dueLabel(task.due_date)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commit() {
    const t = text.trim()
    if (t && t !== task.title) onRename(t)
    else setText(task.title)
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-background p-3 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md',
        isDone && 'opacity-60'
      )}
    >
      {task.priority !== 'p4' && (
        <div className={cn('absolute left-0 top-0 h-full w-[3px]', priorityBar[task.priority])} />
      )}

      <div className="flex items-start gap-2.5 pl-1">
        <button
          type="button"
          onClick={onToggle}
          aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
          className={cn(
            'mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all',
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

        <div className="min-w-0 flex-1">
          {editing ? (
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() }
                if (e.key === 'Escape') { setText(task.title); setEditing(false) }
              }}
              onBlur={commit}
              rows={2}
              className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-foreground outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={cn(
                'w-full text-left text-[13px] leading-relaxed',
                isDone && 'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </button>
          )}

          {due && (
            <div className={cn('mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium', due.cls)}>
              <CalendarRange className="h-3 w-3" />
              {due.text}
            </div>
          )}
        </div>

        <div className="opacity-0 transition-opacity group-hover:opacity-100 has-[[data-open]]:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Task menu"
                  data-open
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

// ── Inline add-task inside a column ─────────────────────────────────────────
function CardAdd({ onAdd, onClose }: {
  onAdd: (title: string) => Promise<void>
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  async function submit() {
    if (!text.trim() || busy) return
    setBusy(true)
    try { await onAdd(text.trim()); setText(''); onClose() }
    finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl border border-red-500/50 bg-background p-3 shadow-md">
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
          if (e.key === 'Escape') onClose()
        }}
        rows={2}
        placeholder="Task name"
        className="w-full resize-none bg-transparent text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
      />
      <div className="mt-2 flex justify-end gap-1.5">
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
          disabled={!text.trim() || busy}
          className="flex items-center gap-1 rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Add
        </button>
      </div>
    </div>
  )
}

// ── Column (either "Inbox" default, or a real section) ──────────────────────
export interface BoardColumnData {
  key: string
  section: Section | null   // null = the default un-sectioned "Inbox" column
  title: string
  tasks: Task[]
  projectId: string | null
}

function BoardColumn({ data, onColumnChanged }: {
  data: BoardColumnData
  onColumnChanged: () => void
}) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(data.title)

  const active = data.tasks.filter(t => t.status !== 'completed')

  const rename = useRenameSection()
  const del = useDeleteSection()

  const toggle = useMutation({
    mutationFn: patchTask,
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const handleToggle = useCompleteWithUndo(toggle.mutate)
  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const renameTask = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => patchTaskFields(id, { title }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  async function handleAddTask(title: string) {
    await postTask({
      title,
      project_id: data.projectId,
      section_id: data.section?.id ?? null,
    })
    qc.invalidateQueries({ queryKey: ['tasks'] })
  }

  async function commitRename() {
    if (!data.section) { setEditingName(false); return }
    const n = name.trim()
    setEditingName(false)
    if (!n || n === data.title) { setName(data.title); return }
    try {
      await rename.mutateAsync({ id: data.section.id, name: n })
      onColumnChanged()
      toast.success('Section renamed')
    } catch (e) {
      toast.error(`Rename failed: ${e instanceof Error ? e.message : String(e)}`)
      setName(data.title)
    }
  }

  async function handleDelete() {
    if (!data.section) return
    if (!confirm(`Delete section "${data.title}"? Its tasks will move to the default column.`)) return
    try {
      await del.mutateAsync(data.section.id)
      toast.success('Section deleted')
      onColumnChanged()
    } catch (e) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  async function handleDuplicate() {
    // Not persisted as a real duplicate — just spawn an empty section with the same name
    if (!data.section) return
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${data.title} copy`,
          project_id: data.projectId,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      onColumnChanged()
      toast.success('Section duplicated')
    } catch (e) {
      toast.error(`Duplicate failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const isDefaultColumn = !data.section

  return (
    <div className="flex w-72 flex-shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-2 flex items-center gap-2 px-1">
        {isDefaultColumn && (
          <Inbox className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}

        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setName(data.title); setEditingName(false) }
            }}
            onBlur={commitRename}
            className="min-w-0 flex-1 border-b border-red-500 bg-transparent text-[13px] font-bold text-foreground outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => !isDefaultColumn && setEditingName(true)}
            className="min-w-0 truncate text-left text-[13px] font-bold text-foreground hover:text-foreground/80"
            disabled={isDefaultColumn}
          >
            {data.title}
          </button>
        )}

        {active.length > 0 && (
          <span className="text-[12px] font-medium tabular-nums text-muted-foreground">
            {active.length}
          </span>
        )}

        <div className="ml-auto flex items-center">
          <button
            type="button"
            onClick={() => setAdding(true)}
            title="Add task"
            aria-label="Add task"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {!isDefaultColumn && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label="Column menu"
                    data-open
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setEditingName(true)}>
                  <PenLine className="mr-2 h-3.5 w-3.5" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAdding(true)}>
                  <Plus className="mr-2 h-3.5 w-3.5" /> Add task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate section
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {active.map(t => (
          <TaskCard
            key={t.id}
            task={t}
            onToggle={() => handleToggle(t)}
            onDelete={() => remove.mutate(t.id)}
            onRename={(title) => renameTask.mutate({ id: t.id, title })}
          />
        ))}

        {adding ? (
          <CardAdd onAdd={handleAddTask} onClose={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
          >
            <Plus className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
            Add task
          </button>
        )}
      </div>
    </div>
  )
}

// ── Add-column tile at the end of the board ─────────────────────────────────
function AddColumnTile({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (adding) ref.current?.focus() }, [adding])

  async function submit() {
    if (!name.trim() || busy) return
    setBusy(true)
    try { await onAdd(name.trim()); setName(''); setAdding(false) }
    finally { setBusy(false) }
  }

  if (adding) {
    return (
      <div className="w-72 flex-shrink-0">
        <div className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-background p-2.5 shadow-md">
          <Layers className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
          <input
            ref={ref}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') { setName(''); setAdding(false) }
            }}
            placeholder="Section name"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
          />
          <button
            type="button"
            onClick={() => { setName(''); setAdding(false) }}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || busy}
            className="flex items-center gap-1 rounded-md bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            Add
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="group flex h-11 w-72 flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-transparent text-[13px] font-medium text-muted-foreground transition-all hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-500"
    >
      <FolderPlus className="h-4 w-4" />
      Add section
    </button>
  )
}

// ── The board itself ────────────────────────────────────────────────────────
export function BoardView({
  columns, projectId, onColumnChanged,
}: {
  columns: BoardColumnData[]
  projectId: string | null
  onColumnChanged: () => void
}) {
  const createSection = useCreateSection()

  async function handleAddColumn(name: string) {
    try {
      await createSection.mutateAsync({ name, project_id: projectId })
      onColumnChanged()
      toast.success('Section added')
    } catch (e) {
      if (e instanceof SectionsApiError && e.code === 'MISSING_TABLE') {
        toast.error('Run `npm run db:push` — the sections table is missing.', { duration: 8000 })
      } else if (e instanceof SectionsApiError) {
        toast.error(e.message, { duration: 8000 })
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        toast.error(`Could not create section: ${msg}`, { duration: 8000 })
      }
    }
  }

  return (
    <div className="scrollbar-hide -mx-6 overflow-x-auto pb-6 lg:-mx-10">
      <div className="flex min-w-max items-start gap-4 px-6 lg:px-10">
        {columns.map(col => (
          <BoardColumn
            key={col.key}
            data={col}
            onColumnChanged={onColumnChanged}
          />
        ))}
        <AddColumnTile onAdd={handleAddColumn} />
      </div>
    </div>
  )
}
