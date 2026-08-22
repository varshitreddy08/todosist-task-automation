'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { format, addDays, isToday, isTomorrow } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

const TODAY    = () => new Date().toISOString().split('T')[0]
const TOMORROW = () => addDays(new Date(), 1).toISOString().split('T')[0]
const NEXTWK   = () => addDays(new Date(), 7).toISOString().split('T')[0]

interface Props {
  value: string           // yyyy-MM-dd
  onChange: (v: string) => void
}

function dateLabel(v: string) {
  const d = new Date(v + 'T12:00:00')
  if (isToday(d))    return { text: 'Today',     cls: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' }
  if (isTomorrow(d)) return { text: 'Tomorrow',  cls: 'text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' }
  return { text: format(d, 'd MMM'), cls: 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' }
}

export function TaskDatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const label = useMemo(() => dateLabel(value), [value])

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function pick(v: string) { onChange(v); setOpen(false) }

  const selectedDate = new Date(value + 'T12:00:00')

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border font-medium transition-colors',
          label.cls
        )}
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        {label.text}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-background border border-border rounded-xl shadow-xl z-[100] overflow-hidden w-[260px]">
          {/* Quick shortcuts */}
          <div className="flex gap-1.5 p-2 pb-1 border-b border-border">
            <button
              type="button"
              onClick={() => pick(TODAY())}
              className={cn(
                'flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-colors',
                value === TODAY()
                  ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => pick(TOMORROW())}
              className={cn(
                'flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-colors',
                value === TOMORROW()
                  ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => pick(NEXTWK())}
              className={cn(
                'flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-colors',
                value === NEXTWK()
                  ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              Next week
            </button>
          </div>

          {/* Full calendar */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) pick(date.toISOString().split('T')[0])
            }}
            disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
          />
        </div>
      )}
    </div>
  )
}
