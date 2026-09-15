'use client'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { X, History, CheckCircle2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

type ActivityRow = {
  id: string
  action: string
  task_title: string
  project_name: string | null
  created_at: string
}

const RANGES = [
  { key: '', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 days' },
  { key: 'month', label: '30 days' },
] as const

function dayLabel(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, MMM d')
}

export function HistorySidePanel({ open, onClose }: Props) {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('week')
  const [query, setQuery] = useState('')

  const { data: rows = [], isFetching } = useQuery<ActivityRow[]>({
    queryKey: ['activity', 'panel', range],
    queryFn: () =>
      fetch(`/api/activity?action=completed&limit=200${range ? `&date=${range}` : ''}`)
        .then((r) => (r.ok ? r.json() : [])),
    refetchInterval: open ? 15000 : false,
    enabled: open,
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

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[400px] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold">Completed history</span>
            {isFetching && (
              <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter completed tasks"
              className="h-9 w-full rounded-md border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-red-500/50 focus:bg-background"
            />
          </div>
          <div className="mt-2.5 flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                  range === r.key
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">No completed tasks yet</p>
              <p className="text-xs text-muted-foreground">
                Finish something and it&apos;ll show up here.
              </p>
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.key}>
                <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-1.5 backdrop-blur">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{g.items.length}</span>
                </div>
                <ul className="px-3 py-1">
                  {g.items.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                    >
                      <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
                          <path
                            d="M2 5l2.5 2.5L8 3"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
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
            ))
          )}
        </div>
      </aside>
    </>
  )
}
