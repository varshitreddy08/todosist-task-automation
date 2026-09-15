'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useAppStore } from '@/store/useAppStore'
import { useProjects } from '@/hooks/useProjects'
import {
  Search, CheckSquare, LayoutDashboard, BarChart3, Target, Clock, Plus, BookOpen,
  Calendar, Heart, ArrowRight, CheckCircle2, Hash, History, Inbox, CalendarCheck2,
  Sparkles, CornerDownLeft, Command as CommandIcon,
} from 'lucide-react'
import type { Task } from '@/types'
import { cn } from '@/lib/utils'

const QUICK_ACTIONS = [
  { label: 'Add new task', icon: Plus, action: 'add-task', shortcut: 'N', hint: 'Quick add' },
  { label: 'Go to Inbox', icon: Inbox, action: 'nav:/inbox' },
  { label: 'Today',        icon: CalendarCheck2, action: 'nav:/today' },
  { label: 'Dashboard',    icon: LayoutDashboard, action: 'nav:/dashboard' },
  { label: 'Calendar',     icon: Calendar, action: 'nav:/calendar' },
  { label: 'Activity / History', icon: History, action: 'nav:/history' },
  { label: 'Analytics',    icon: BarChart3, action: 'nav:/analytics' },
  { label: 'Study Hub',    icon: BookOpen, action: 'nav:/study' },
  { label: 'Habits',       icon: Heart, action: 'nav:/habits' },
  { label: 'Goals',        icon: Target, action: 'nav:/goals' },
  { label: 'Focus Mode',   icon: Clock, action: 'nav:/focus' },
] as const

const priorityColor: Record<string, string> = {
  p1: 'bg-red-500/15 text-red-600 dark:text-red-400',
  p2: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  p3: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  p4: 'bg-muted text-muted-foreground',
}

const RECENT_KEY = 'tf.recent-search'

function loadRecents(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]).slice(0, 6) : []
  } catch {
    return []
  }
}

function saveRecent(q: string) {
  if (typeof window === 'undefined' || !q.trim()) return
  const prev = loadRecents().filter((s) => s !== q)
  const next = [q, ...prev].slice(0, 6)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
}

type LucideIcon = React.ComponentType<{ className?: string }>

type Item =
  | { type: 'task'; id: string; task: Task }
  | { type: 'project'; id: string; name: string; color?: string; count?: number }
  | { type: 'action'; id: string; label: string; icon: LucideIcon; action: string; shortcut?: string; hint?: string }
  | { type: 'recent'; id: string; query: string }

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [recents, setRecents] = useState<string[]>([])
  const router = useRouter()
  const { setQuickAddOpen } = useAppStore()
  const { data: projects = [] } = useProjects()
  const listRef = useRef<HTMLDivElement>(null)

  const q = query.trim()

  const { data: tasks = [], isFetching } = useQuery<Task[]>({
    queryKey: ['tasks', 'search', q],
    queryFn: () =>
      fetch(`/api/tasks?q=${encodeURIComponent(q)}&limit=15`).then((r) => (r.ok ? r.json() : [])),
    enabled: q.length > 1,
    staleTime: 5000,
  })

  useEffect(() => {
    ;(window as unknown as { __openCommandPalette?: () => void }).__openCommandPalette = () => setOpen(true)
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecents(loadRecents())
    } else {
      setQuery('')
      setActiveIdx(0)
    }
  }, [open])

  // ── Build item list ───────────────────────────────────────────────────────
  const items: Item[] = useMemo(() => {
    const out: Item[] = []
    const openTasks = tasks.filter((t) => t.status !== 'completed')
    const doneTasks = tasks.filter((t) => t.status === 'completed')

    if (!q) {
      recents.forEach((r) => out.push({ type: 'recent', id: `rec:${r}`, query: r }))
      QUICK_ACTIONS.slice(0, 6).forEach((a) =>
        out.push({ type: 'action', id: `act:${a.action}`, label: a.label, icon: a.icon, action: a.action, hint: 'hint' in a ? a.hint : undefined, shortcut: 'shortcut' in a ? a.shortcut : undefined })
      )
      return out
    }

    openTasks.forEach((t) => out.push({ type: 'task', id: `t:${t.id}`, task: t }))
    doneTasks.forEach((t) => out.push({ type: 'task', id: `t:${t.id}`, task: t }))

    projects
      .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 6)
      .forEach((p) => out.push({ type: 'project', id: `p:${p.id}`, name: p.name, color: p.color, count: p.task_count }))

    QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 6)
      .forEach((a) =>
        out.push({ type: 'action', id: `act:${a.action}`, label: a.label, icon: a.icon, action: a.action, hint: 'hint' in a ? a.hint : undefined, shortcut: 'shortcut' in a ? a.shortcut : undefined })
      )

    return out
  }, [q, tasks, projects, recents])

  // Clamp activeIdx when items change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIdx((i) => Math.min(i, Math.max(0, items.length - 1)))
  }, [items.length])

  // Keep active item in view
  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const execute = useCallback((item: Item) => {
    saveRecent(q)
    setOpen(false)
    if (item.type === 'task') {
      const t = item.task
      router.push(t.project_id ? `/projects/${t.project_id}` : '/inbox')
    } else if (item.type === 'project') {
      router.push(`/projects/${item.id.slice(2)}`)
    } else if (item.type === 'recent') {
      setQuery(item.query)
      setOpen(true)
    } else {
      if (item.action === 'add-task') setQuickAddOpen(true)
      else if (item.action.startsWith('nav:')) router.push(item.action.slice(4))
    }
  }, [q, router, setQuickAddOpen])

  // ── Group counts for section headers ──────────────────────────────────────
  const sections = useMemo(() => {
    const open = items.filter((i) => i.type === 'task' && i.task.status !== 'completed')
    const done = items.filter((i) => i.type === 'task' && i.task.status === 'completed')
    const proj = items.filter((i) => i.type === 'project')
    const acts = items.filter((i) => i.type === 'action')
    const recentList = items.filter((i) => i.type === 'recent')
    return { open, done, proj, acts, recentList }
  }, [items])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search TaskFlow</DialogTitle>

        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
            placeholder="Search tasks, projects, actions…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, items.length - 1)) }
              if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
              if (e.key === 'Enter')     { e.preventDefault(); if (items[activeIdx]) execute(items[activeIdx]) }
            }}
          />
          {isFetching && (
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          )}
          <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-2">
          {items.length === 0 && q && (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No results for &ldquo;{q}&rdquo;</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different keyword, or press{' '}
                <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">Enter</kbd>{' '}
                to create it as a task.
              </p>
              <button
                onClick={() => {
                  setOpen(false)
                  setQuickAddOpen(true)
                }}
                className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-medium text-white hover:bg-red-600"
              >
                <Plus className="h-3.5 w-3.5" /> Create task: {q.slice(0, 30)}
              </button>
            </div>
          )}

          {sections.recentList.length > 0 && (
            <Section label="Recent searches" icon={<History className="h-3 w-3" />}>
              {sections.recentList.map((it) => {
                const i = items.indexOf(it)
                return (
                  <Row key={it.id} active={i === activeIdx} onSelect={() => execute(it)} onHover={() => setActiveIdx(i)}>
                    <History className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-left">{it.type === 'recent' ? it.query : ''}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Row>
                )
              })}
            </Section>
          )}

          {sections.open.length > 0 && (
            <Section label={q ? 'Open tasks' : ''} icon={<CheckSquare className="h-3 w-3" />} count={sections.open.length}>
              {sections.open.map((it) => {
                const t = (it as Extract<Item, { type: 'task' }>).task
                const i = items.indexOf(it)
                return (
                  <Row key={it.id} active={i === activeIdx} onSelect={() => execute(it)} onHover={() => setActiveIdx(i)}>
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-muted-foreground/40" />
                    <span className="flex-1 truncate text-left">
                      <HighlightedTitle title={t.title} query={q} />
                    </span>
                    {t.priority && t.priority !== 'p4' && (
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums', priorityColor[t.priority])}>
                        {t.priority.toUpperCase()}
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Row>
                )
              })}
            </Section>
          )}

          {sections.done.length > 0 && (
            <Section label="Completed" icon={<CheckCircle2 className="h-3 w-3" />} count={sections.done.length}>
              {sections.done.map((it) => {
                const t = (it as Extract<Item, { type: 'task' }>).task
                const i = items.indexOf(it)
                return (
                  <Row key={it.id} active={i === activeIdx} onSelect={() => execute(it)} onHover={() => setActiveIdx(i)}>
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="flex-1 truncate text-left text-muted-foreground line-through decoration-muted-foreground/60">
                      <HighlightedTitle title={t.title} query={q} />
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Row>
                )
              })}
            </Section>
          )}

          {sections.proj.length > 0 && (
            <Section label="Projects" icon={<Hash className="h-3 w-3" />} count={sections.proj.length}>
              {sections.proj.map((it) => {
                const i = items.indexOf(it)
                const p = it as Extract<Item, { type: 'project' }>
                return (
                  <Row key={it.id} active={i === activeIdx} onSelect={() => execute(it)} onHover={() => setActiveIdx(i)}>
                    <span
                      className="h-3 w-3 flex-shrink-0 rounded-sm"
                      style={{ backgroundColor: p.color || '#f97316' }}
                    />
                    <span className="flex-1 truncate text-left">
                      <HighlightedTitle title={p.name} query={q} />
                    </span>
                    {typeof p.count === 'number' && (
                      <span className="text-[11px] tabular-nums text-muted-foreground">{p.count}</span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Row>
                )
              })}
            </Section>
          )}

          {sections.acts.length > 0 && (
            <Section label={q ? 'Actions' : 'Jump to'} icon={<CommandIcon className="h-3 w-3" />}>
              {sections.acts.map((it) => {
                const i = items.indexOf(it)
                const a = it as Extract<Item, { type: 'action' }>
                const Icon = a.icon
                return (
                  <Row key={it.id} active={i === activeIdx} onSelect={() => execute(it)} onHover={() => setActiveIdx(i)}>
                    <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-left">{a.label}</span>
                    {a.shortcut && (
                      <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {a.shortcut}
                      </kbd>
                    )}
                  </Row>
                )
              })}
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">↑</kbd>
            <kbd className="rounded border bg-muted px-1">↓</kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1"><CornerDownLeft className="inline h-2.5 w-2.5" /></kbd>
            open
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: 'linear-gradient(135deg, #ff7a4d, #ff4d6d)' }}
            />
            TaskFlow search
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({
  label,
  icon,
  count,
  children,
}: {
  label: string
  icon?: React.ReactNode
  count?: number
  children: React.ReactNode
}) {
  if (!label && !count) return <>{children}</>
  return (
    <div className="mb-1">
      {label && (
        <div className="flex items-center justify-between px-4 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {icon}
            {label}
          </span>
          {typeof count === 'number' && count > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground/70">{count}</span>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

function Row({
  active,
  onSelect,
  onHover,
  children,
}: {
  active: boolean
  onSelect: () => void
  onHover: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onMouseEnter={onHover}
      onClick={onSelect}
      data-active={active || undefined}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors',
        active ? 'bg-red-500/10 text-foreground' : 'hover:bg-muted/50 text-foreground'
      )}
    >
      {children}
    </button>
  )
}

function HighlightedTitle({ title, query }: { title: string; query: string }) {
  if (!query) return <>{title}</>
  const idx = title.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{title}</>
  return (
    <>
      {title.slice(0, idx)}
      <mark className="bg-red-500/20 text-inherit rounded px-0.5">
        {title.slice(idx, idx + query.length)}
      </mark>
      {title.slice(idx + query.length)}
    </>
  )
}
