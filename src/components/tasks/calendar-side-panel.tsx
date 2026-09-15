'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, addDays, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isToday } from 'date-fns'
import { X, ChevronLeft, ChevronRight, ChevronDown, Clock, Flag, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  open: boolean
  onClose: () => void
}

const priorityDotColor: Record<string, string> = {
  p1: 'bg-red-500',
  p2: 'bg-orange-400',
  p3: 'bg-blue-500',
  p4: 'bg-muted-foreground/40',
}

async function fetchCalendarTasks(month: string): Promise<Task[]> {
  const res = await fetch(`/api/tasks?filter=calendar&month=${month}`)
  if (!res.ok) return []
  return res.json()
}

export function CalendarSidePanel({ open, onClose }: Props) {
  const [cursor, setCursor] = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear())
  const pickerRef = useRef<HTMLDivElement>(null)

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

  // When the parent panel closes, also collapse the picker.
  // The rule flags legitimate prop-sync patterns; suppress narrowly.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!open) setPickerOpen(false) }, [open])

  const monthKey = format(cursor, 'yyyy-MM')

  const { data: tasks = [], isFetching } = useQuery({
    queryKey: ['tasks', 'calendar', monthKey],
    queryFn: () => fetchCalendarTasks(monthKey),
    refetchInterval: open ? 15000 : false,
    enabled: open,
  })

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!t.due_date) continue
      ;(map[t.due_date] ??= []).push(t)
    }
    return map
  }, [tasks])

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    const days: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
    return days
  }, [cursor])

  const selectedKey = format(selected, 'yyyy-MM-dd')
  const selectedTasks = tasksByDate[selectedKey] ?? []

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Panel */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[380px] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold">Calendar</span>
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

        {/* Month navigator */}
        <div className="relative flex items-center justify-between px-4 pt-3">
          <button
            onClick={() => setCursor(subMonths(cursor, 1))}
            title="Previous month"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={togglePicker}
            aria-expanded={pickerOpen}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold transition-colors',
              pickerOpen ? 'bg-muted text-foreground' : 'hover:bg-muted'
            )}
          >
            {format(cursor, 'MMMM yyyy')}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', pickerOpen && 'rotate-180')}
            />
          </button>

          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            title="Next month"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Year + month picker */}
          {pickerOpen && (
            <div
              ref={pickerRef}
              className="absolute left-3 right-3 top-full z-30 mt-2 rounded-xl border border-border bg-background p-3 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <button
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
                  {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
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
                  const now = new Date()
                  const isThisMonth = now.getFullYear() === pickerYear && now.getMonth() === idx
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setCursor(new Date(pickerYear, idx, 1))
                        setPickerOpen(false)
                      }}
                      className={cn(
                        'rounded-md py-2 text-[12px] font-medium transition-colors',
                        isCurrent
                          ? 'bg-red-500 text-white shadow-sm hover:bg-red-600'
                          : isThisMonth
                            ? 'ring-1 ring-red-500/50 text-foreground hover:bg-muted'
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
                  onClick={() => {
                    const t = new Date()
                    setCursor(t); setSelected(t); setPickerOpen(false)
                  }}
                  className="rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Jump to today
                </button>
                <button
                  onClick={() => setPickerOpen(false)}
                  className="rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="px-3 pt-3">
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d) => {
              const key = format(d, 'yyyy-MM-dd')
              const isCurrentMonth = d.getMonth() === cursor.getMonth()
              const hasTasks = (tasksByDate[key]?.length ?? 0) > 0
              const isSelected = isSameDay(d, selected)
              const _isToday = isToday(d)
              return (
                <button
                  key={key}
                  onClick={() => setSelected(d)}
                  className={cn(
                    'relative flex h-9 flex-col items-center justify-center rounded-md text-[12px] font-medium transition',
                    !isCurrentMonth && 'text-muted-foreground/40',
                    isCurrentMonth && !isSelected && 'text-foreground hover:bg-muted',
                    isSelected && 'bg-red-500 text-white shadow-sm',
                    !isSelected && _isToday && 'ring-1 ring-red-500/50'
                  )}
                >
                  {d.getDate()}
                  {hasTasks && (
                    <span
                      className={cn(
                        'absolute bottom-1 h-1 w-1 rounded-full',
                        isSelected ? 'bg-white/90' : 'bg-red-500'
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Day list */}
        <div className="mt-4 flex-1 overflow-y-auto border-t border-border">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
            <span className="text-sm font-semibold">
              {isToday(selected) ? 'Today' : format(selected, 'EEE, MMM d')}
            </span>
            <span className="text-xs text-muted-foreground">
              {selectedTasks.length} {selectedTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {selectedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">No tasks scheduled</p>
              <p className="text-xs text-muted-foreground">Nothing on the docket for this day.</p>
            </div>
          ) : (
            <ul className="px-3 py-2">
              {selectedTasks
                .sort((a, b) => (a.due_time ?? '99:99').localeCompare(b.due_time ?? '99:99'))
                .map((task) => (
                  <li
                    key={task.id}
                    className={cn(
                      'group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50',
                      task.status === 'completed' && 'opacity-50'
                    )}
                  >
                    <div className={cn('mt-1 h-2 w-2 flex-shrink-0 rounded-full', priorityDotColor[task.priority] ?? priorityDotColor.p4)} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm text-foreground', task.status === 'completed' && 'line-through')}>
                        {task.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        {task.due_time && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.due_time.slice(0, 5)}
                          </span>
                        )}
                        {task.priority && task.priority !== 'p4' && (
                          <span className="inline-flex items-center gap-1 capitalize">
                            <Flag className="h-3 w-3" />
                            {task.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
