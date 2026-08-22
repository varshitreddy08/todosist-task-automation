'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, isSameDay, isYesterday, formatDistanceToNow } from 'date-fns'
import { useProjects } from '@/hooks/useProjects'
import { cn } from '@/lib/utils'
import { ChevronDown, CheckCircle2, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

// ── Types ────────────────────────────────────────────────────────────────────
type Action = 'added' | 'completed' | 'uncompleted' | 'changed_priority' | 'set_date' | 'changed_date' | 'deleted'

interface ActivityItem {
  id: string
  action: Action
  task_title: string
  project_name: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
}

// ── Filter options ───────────────────────────────────────────────────────────
const ACTION_OPTIONS = [
  { value: '',                  label: 'All actions' },
  { value: 'completed',         label: 'Completed tasks' },
  { value: 'added',             label: 'Added tasks' },
  { value: 'changed_priority',  label: 'Priority changes' },
  { value: 'set_date',          label: 'Date set' },
  { value: 'changed_date',      label: 'Date changes' },
  { value: 'deleted',           label: 'Deleted tasks' },
]

const DATE_OPTIONS = [
  { value: '',       label: 'Any date' },
  { value: 'today',  label: 'Today' },
  { value: 'week',   label: 'Last 7 days' },
  { value: 'month',  label: 'Last 30 days' },
]

// ── Dropdown component ───────────────────────────────────────────────────────
function FilterDropdown({ label, options, value, onChange }: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] border transition-colors select-none',
          value
            ? 'border-[#db4c3f] text-[#db4c3f] bg-red-50 dark:bg-red-950/20 dark:border-red-500 dark:text-red-400'
            : 'border-[#ddd] dark:border-border text-[#555] dark:text-muted-foreground hover:border-[#bbb] dark:hover:border-muted-foreground'
        )}
      >
        {selected?.label ?? label}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-48 bg-background border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'w-full text-left px-3 py-2 text-[13px] hover:bg-muted transition-colors',
                opt.value === value ? 'text-[#db4c3f] font-medium' : 'text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Project dropdown ─────────────────────────────────────────────────────────
function ProjectDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: projects = [] } = useProjects()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const options = [
    { value: '', label: 'All projects' },
    { value: 'inbox', label: 'Inbox' },
    ...projects.map(p => ({ value: p.id, label: p.name })),
  ]
  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] border transition-colors select-none',
          value
            ? 'border-[#db4c3f] text-[#db4c3f] bg-red-50 dark:bg-red-950/20 dark:border-red-500 dark:text-red-400'
            : 'border-[#ddd] dark:border-border text-[#555] dark:text-muted-foreground hover:border-[#bbb] dark:hover:border-muted-foreground'
        )}
      >
        {selected?.label ?? 'All projects'}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-48 bg-background border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'w-full text-left px-3 py-2 text-[13px] hover:bg-muted transition-colors',
                opt.value === value ? 'text-[#db4c3f] font-medium' : 'text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Date group label ─────────────────────────────────────────────────────────
function dateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const d = format(date, 'd MMM')
  const wd = format(date, 'EEEE')
  if (isSameDay(date, new Date())) return `${d} · Today · ${wd}`
  if (isYesterday(date)) return `${d} · Yesterday · ${wd}`
  return `${d} · ${wd}`
}

// ── Relative time ─────────────────────────────────────────────────────────────
function timeLabel(isoStr: string): string {
  const date = new Date(isoStr)
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(date, { addSuffix: true })
  }
  return format(date, 'd MMM yyyy HH:mm')
}

// ── Priority display ─────────────────────────────────────────────────────────
function priorityLabel(val: string): string {
  return val.toUpperCase() // p1→P1, p2→P2 etc.
}

// ── Action description ───────────────────────────────────────────────────────
function ActionDescription({ item }: { item: ActivityItem }) {
  const isCompleted = item.action === 'completed'
  const isUncompleted = item.action === 'uncompleted'
  const isAdded = item.action === 'added'
  const isDeleted = item.action === 'deleted'
  const isPriority = item.action === 'changed_priority'
  const isSetDate = item.action === 'set_date'
  const isChangedDate = item.action === 'changed_date'

  const taskName = (
    <span className={cn(
      'text-[13px] px-1 py-0.5 rounded bg-[#f5f5f5] dark:bg-muted text-[#555] dark:text-muted-foreground',
      isCompleted && 'line-through'
    )}>
      {item.task_title}
    </span>
  )

  if (isCompleted) return <span className="text-[13px] text-[#333] dark:text-foreground">completed {taskName}</span>
  if (isUncompleted) return <span className="text-[13px] text-[#333] dark:text-foreground">uncompleted {taskName}</span>
  if (isAdded) return <span className="text-[13px] text-[#333] dark:text-foreground">added {taskName}</span>
  if (isDeleted) return <span className="text-[13px] text-[#333] dark:text-foreground">deleted {taskName}</span>
  if (isPriority) return (
    <span className="text-[13px] text-[#333] dark:text-foreground">
      changed the priority of {taskName}{' '}
      to <span className="font-medium">{priorityLabel(item.new_value ?? '')}</span>
    </span>
  )
  if (isSetDate) return (
    <span className="text-[13px] text-[#333] dark:text-foreground">
      set the date of {taskName}{' '}
      to <span className="font-medium">{item.new_value}</span>
    </span>
  )
  if (isChangedDate) return (
    <span className="text-[13px] text-[#333] dark:text-foreground">
      changed the date of {taskName}{' '}
      to <span className="font-medium">{item.new_value}</span>
    </span>
  )
  return <span className="text-[13px] text-[#333] dark:text-foreground">{item.action} {taskName}</span>
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ReportingPage() {
  const { data: session } = useSession()
  const [actionFilter, setActionFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const { data: items = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['activity', actionFilter, projectFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (actionFilter) params.set('action', actionFilter)
      if (projectFilter && projectFilter !== 'inbox') params.set('project', projectFilter)
      if (dateFilter) params.set('date', dateFilter)
      const res = await fetch(`/api/activity?${params}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
  })

  // Filter by inbox (project_name === 'Inbox') client-side
  const filtered = projectFilter === 'inbox'
    ? items.filter(i => i.project_name === 'Inbox')
    : items

  // Group by calendar date
  const groups: { dateStr: string; label: string; items: ActivityItem[] }[] = []
  for (const item of filtered) {
    const dateStr = item.created_at.split('T')[0]
    const existing = groups.find(g => g.dateStr === dateStr)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.push({ dateStr, label: dateGroupLabel(item.created_at), items: [item] })
    }
  }

  const displayName = session?.user?.name?.split(' ')[0] ?? 'You'
  const initials = (session?.user?.name ?? 'U').slice(0, 1).toUpperCase()

  // Compute title
  const actionLabel = ACTION_OPTIONS.find(o => o.value === actionFilter)?.label ?? 'All actions'
  const pageTitle = actionFilter
    ? `Reporting: ${actionLabel}`
    : 'Reporting: All'

  return (
    <div style={{ maxWidth: 860 }} className="mx-auto px-10 py-10">
      {/* Title */}
      <h1 className="text-[28px] font-extrabold text-[#202020] dark:text-foreground mb-5">
        {pageTitle}
      </h1>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <FilterDropdown
          label="Personal workspace"
          options={[{ value: '', label: 'Personal workspace' }]}
          value=""
          onChange={() => {}}
        />

        <ProjectDropdown value={projectFilter} onChange={setProjectFilter} />

        <FilterDropdown
          label={displayName}
          options={[{ value: '', label: displayName }]}
          value=""
          onChange={() => {}}
        />

        <FilterDropdown
          label="All actions"
          options={ACTION_OPTIONS}
          value={actionFilter}
          onChange={setActionFilter}
        />

        <FilterDropdown
          label="Any date"
          options={DATE_OPTIONS}
          value={dateFilter}
          onChange={setDateFilter}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-[#aaa]" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-[#aaa]">
          <CheckCircle2 className="w-12 h-12 opacity-30" />
          <p className="text-[14px]">No activity yet. Start completing tasks to see your history here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <div key={group.dateStr}>
              {/* Date header */}
              <div className="flex items-center gap-4 mb-1">
                <h2 className="text-[14px] font-semibold text-[#202020] dark:text-foreground whitespace-nowrap">
                  {group.label}
                </h2>
                <span className="text-[13px] text-[#aaa] dark:text-muted-foreground">{group.items.length}</span>
              </div>
              <div className="h-px bg-[#f0f0f0] dark:bg-border mb-3" />

              {/* Activity items */}
              <div className="space-y-0">
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-3 border-b border-[#f5f5f5] dark:border-border/40 last:border-0"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 relative">
                      <span className="text-white text-[13px] font-bold">{initials}</span>
                      {item.action === 'completed' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white dark:border-background flex items-center justify-center">
                          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none">
                            <path d="M2 5l2 2L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className="text-[13px] font-semibold text-[#202020] dark:text-foreground">
                            {displayName}
                          </span>
                          <span className="text-[11px] text-[#aaa] dark:text-muted-foreground bg-[#f5f5f5] dark:bg-muted px-1.5 py-0.5 rounded-full">
                            You
                          </span>
                          <ActionDescription item={item} />
                        </div>

                        {/* Right: project + time */}
                        <div className="flex items-center gap-2 flex-shrink-0 text-[12px] text-[#aaa] dark:text-muted-foreground whitespace-nowrap">
                          <span>{item.project_name ?? 'Inbox'}</span>
                          <span>·</span>
                          <span>{timeLabel(item.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* End of history */}
          {filtered.length > 0 && (
            <p className="text-center text-[13px] text-[#aaa] dark:text-muted-foreground py-4">
              That&apos;s it. No more history to load.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
