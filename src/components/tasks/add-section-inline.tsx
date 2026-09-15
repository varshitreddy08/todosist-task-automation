'use client'
import { useEffect, useRef, useState } from 'react'
import { Plus, FolderPlus, Loader2, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateSection, SectionsApiError } from '@/hooks/useSections'

interface Props {
  /** null = add an inbox-level (project-less) section */
  projectId: string | null
  /** Human label for the "target" — shown in the success toast */
  targetLabel?: string
  /** Called after successful create so the parent view can refetch */
  onCreated?: () => void
  /** Layout style */
  variant?: 'inline' | 'stacked'
}

/**
 * Renders an "Add section" button (paired with an existing "Add task" button
 * upstream). Clicking it swaps to an inline form to name and create the section.
 * Errors are surfaced with the real message via the shared SectionsApiError.
 */
export function AddSectionInline({ projectId, targetLabel = 'Inbox', onCreated, variant = 'inline' }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const create = useCreateSection()

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function submit() {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await create.mutateAsync({ name: name.trim(), project_id: projectId })
      toast.success(projectId ? 'Section added' : `Section added to ${targetLabel}`)
      setName('')
      setEditing(false)
      onCreated?.()
    } catch (e) {
      if (e instanceof SectionsApiError && e.code === 'MISSING_TABLE') {
        toast.error('Run `npm run db:push` — the sections table is missing.', { duration: 8000 })
      } else if (e instanceof SectionsApiError) {
        toast.error(e.message, { duration: 8000 })
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        toast.error(`Could not create section: ${msg}`, { duration: 8000 })
      }
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="my-2 flex items-center gap-2 rounded-lg border border-red-500/50 bg-background p-2.5 shadow-sm">
        <Layers className="h-4 w-4 flex-shrink-0 text-red-500" />
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); submit() }
            if (e.key === 'Escape') { setName(''); setEditing(false) }
          }}
          placeholder="Name this section"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="button"
          onClick={() => { setName(''); setEditing(false) }}
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

  const btnClass = variant === 'stacked'
    ? 'mt-0.5 flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-red-500'
    : 'inline-flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-red-500'

  return (
    <button type="button" onClick={() => setEditing(true)} className={btnClass}>
      <FolderPlus className="h-4 w-4 flex-shrink-0 text-red-500" />
      Add section
    </button>
  )
}

/**
 * Convenience wrapper that renders "Add task" and "Add section" as a pair.
 * Use when you already have an `onAddTask` handler.
 */
export function AddRowButtons({
  onAddTask, projectId, targetLabel, onCreated,
}: {
  onAddTask: () => void
  projectId: string | null
  targetLabel?: string
  onCreated?: () => void
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={onAddTask}
        className="inline-flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-red-500"
      >
        <Plus className="h-4 w-4 flex-shrink-0 text-red-500" />
        Add task
      </button>
      <AddSectionInline projectId={projectId} targetLabel={targetLabel} onCreated={onCreated} />
    </div>
  )
}
