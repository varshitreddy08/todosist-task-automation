'use client'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

const IDLE_CLS = {
  p1: 'border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
  p2: 'border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30',
  p3: 'border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30',
  p4: 'border-muted-foreground/30 hover:bg-muted/50',
} as const

const DONE_CLS = {
  p1: 'bg-red-500 border-red-500',
  p2: 'bg-orange-400 border-orange-400',
  p3: 'bg-blue-400 border-blue-400',
  p4: 'bg-muted-foreground/30 border-muted-foreground/30',
} as const

export function TaskRow({
  task,
  onToggle,
}: {
  task: Task
  onToggle: () => void
}) {
  const isDone = task.status === 'completed'
  const p = task.priority as keyof typeof IDLE_CLS

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors group',
        isDone && 'opacity-60'
      )}
    >
      <button
        onClick={onToggle}
        className={cn(
          'mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all',
          isDone ? DONE_CLS[p] ?? DONE_CLS.p4 : IDLE_CLS[p] ?? IDLE_CLS.p4
        )}
      >
        {isDone && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0 py-0.5">
        <p className={cn('text-sm leading-snug', isDone && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
        {task.description && !isDone && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
        )}
        {(task.due_time || (task.due_date && !isDone)) && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {task.due_time ? task.due_time : task.due_date}
          </p>
        )}
      </div>
    </div>
  )
}

export function AddTaskRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full py-1.5 px-2 text-muted-foreground hover:text-foreground group transition-colors rounded-lg"
    >
      <div className="w-[18px] h-[18px] rounded-full border-2 border-muted-foreground/30 flex items-center justify-center group-hover:border-primary group-hover:text-primary transition-colors flex-shrink-0">
        <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
          <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-sm group-hover:text-primary">Add task</span>
    </button>
  )
}
