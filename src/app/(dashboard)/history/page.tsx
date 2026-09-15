'use client'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { History, CheckCircle2, Search, Loader2, Trophy, Flame, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'

type ActivityRow = {
  id: string
  action: string
  task_title: string
  project_name: string | null
  created_at: string
}

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Last 7 days' },
  { key: 'month', label: 'Last 30 days' },
  { key: '',      label: 'All time' },
] as const

function dayLabel(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE · MMM d')
}

export default function HistoryPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('week')
  const [query, setQuery] = useState('')

  const { data: rows = [], isLoading, isFetching } = useQuery<ActivityRow[]>({
    queryKey: ['activity', 'history', range],
    queryFn: () =>
      fetch(`/api/activity?action=completed&limit=500${range ? `&date=${range}` : ''}`)
        .then((r) => (r.ok ? r.json() : [])),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  })

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter(
      (r) =>
        r.task_title.toLowerCase().includes(q) ||
        (r.project_name ?? '').toLowerCase().includes(q)
    )
  }, [rows, query])

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: ActivityRow[] }[] = []
    for (const row of filtered) {
      const key = row.created_at.slice(0, 10)
      let group = groups.find((g) => g.key === key)
      if (!group) {
        group = { key, label: dayLabel(row.created_at), items: [] }
        groups.push(group)
      }
      group.items.push(row)
    }
    return groups
  }, [filtered])

  const stats = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = yesterday.toISOString().slice(0, 10)

    const today = rows.filter((r) => r.created_at.slice(0, 10) === todayKey).length
    const yestCount = rows.filter((r) => r.created_at.slice(0, 10) === yesterdayKey).length

    let streak = 0
    const dates = new Set(rows.map((r) => r.created_at.slice(0, 10)))
    const cursor = new Date()
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }

    return { total: rows.length, today, yestCount, streak }
  }, [rows])

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 lg:px-12">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md shadow-orange-500/25"
            style={{ background: 'linear-gradient(135deg, #ff7a4d, #ff4d6d)' }}
          >
            <History className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h1 className="text-[22px] font-bold leading-tight text-foreground">Activity</h1>
            <p className="text-xs text-muted-foreground">
              Everything you&apos;ve completed, in one place.
            </p>
          </div>
          {isFetching && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              live
            </span>
          )}
        </div>

        {/* Stat pills */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Completed today"
            value={stats.today}
            accent="from-red-500/15 to-orange-400/10 text-red-600 dark:text-red-400"
          />
          <StatCard
            icon={<CalendarClock className="h-4 w-4" />}
            label="Yesterday"
            value={stats.yestCount}
            accent="from-blue-500/15 to-cyan-400/10 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={<Trophy className="h-4 w-4" />}
            label={range === '' ? 'All time' : 'In range'}
            value={rows.length}
            accent="from-amber-500/15 to-yellow-400/10 text-amber-700 dark:text-amber-400"
          />
          <StatCard
            icon={<Flame className="h-4 w-4" />}
            label="Day streak"
            value={stats.streak}
            accent="from-emerald-500/15 to-green-400/10 text-emerald-600 dark:text-emerald-400"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search completed tasks…"
            className="h-9 w-full rounded-lg border border-border bg-muted/30 pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground/70 focus:border-red-500/40 focus:bg-background"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                range === r.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nothing here yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete a task and it&apos;ll show up here in real time.
          </p>
        </div>
      ) : (
        <ol className="relative border-l-2 border-border/70 pl-5">
          {grouped.map((g) => (
            <li key={g.key} className="mb-6">
              <span className="absolute -left-[7px] mt-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-4 ring-background" />
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-[13px] font-semibold text-foreground">{g.label}</h2>
                <span className="text-xs text-muted-foreground">{g.items.length} completed</span>
              </div>

              <div className="rounded-xl border border-border bg-background">
                <ul className="divide-y divide-border/60">
                  {g.items.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground line-through decoration-muted-foreground/60">
                          {row.task_title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {row.project_name ?? 'Inbox'} ·{' '}
                          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-background p-4">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70',
          accent
        )}
      />
      <div className="relative flex items-center gap-2 text-xs font-medium text-current">
        {icon}
        <span>{label}</span>
      </div>
      <p className="relative mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}
