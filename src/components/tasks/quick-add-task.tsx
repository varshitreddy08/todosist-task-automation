'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/store/useAppStore'
import { useCreateTask } from '@/hooks/useTasks'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Loader2, Calendar, Clock, Bell } from 'lucide-react'

const schema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const PRIORITIES = [
  { value: 'p1', label: 'Urgent', color: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900 dark:text-red-400', dot: 'bg-red-500' },
  { value: 'p2', label: 'High',   color: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900 dark:text-orange-400', dot: 'bg-orange-500' },
  { value: 'p3', label: 'Medium', color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900 dark:text-blue-400', dot: 'bg-blue-500' },
  { value: 'p4', label: 'Low',    color: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground/50' },
] as const

export function QuickAddTask() {
  const { quickAddOpen, setQuickAddOpen } = useAppStore()
  const [priority, setPriority] = useState<'p1' | 'p2' | 'p3' | 'p4'>('p4')
  const [emailReminder, setEmailReminder] = useState(false)
  const createTask = useCreateTask()
  const { data: session } = useSession()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      due_date: new Date().toISOString().split('T')[0],
    },
  })

  async function onSubmit(data: FormData) {
    try {
      await createTask.mutateAsync({
        title: data.title,
        description: data.description || null,
        priority,
        due_date: data.due_date || null,
        due_time: data.due_time || null,
        status: 'todo',
        is_recurring: false,
      })

      if (emailReminder && data.due_date && session?.user?.email) {
        fetch('/api/email/reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: session.user.email,
            task: { title: data.title, due_date: data.due_date, priority },
          }),
        })
        toast.success('Task created! Reminder will be emailed.')
      } else {
        toast.success('Task created!')
      }

      reset({ due_date: new Date().toISOString().split('T')[0] })
      setPriority('p4')
      setEmailReminder(false)
      setQuickAddOpen(false)
    } catch {
      toast.error('Failed to create task')
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      reset({ due_date: new Date().toISOString().split('T')[0] })
      setPriority('p4')
      setEmailReminder(false)
    }
    setQuickAddOpen(open)
  }

  return (
    <Dialog open={quickAddOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Add Task</DialogTitle>
        <DialogDescription className="sr-only">Create a new task</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b">
            <p className="text-sm font-semibold text-muted-foreground mb-3">New Task</p>
            <Input
              autoFocus
              placeholder="What needs to be done?"
              className="text-base font-medium border-0 p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50 bg-transparent"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
            <Textarea
              placeholder="Add a note (optional)"
              className="resize-none text-sm border-0 p-0 mt-2 min-h-0 h-10 focus-visible:ring-0 bg-transparent text-muted-foreground placeholder:text-muted-foreground/40"
              {...register('description')}
            />
          </div>

          {/* Priority */}
          <div className="px-5 py-3 border-b">
            <p className="text-xs font-medium text-muted-foreground mb-2">Priority</p>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${p.color} ${priority === p.value ? 'ring-2 ring-offset-1 ring-current/50 shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due date + time + reminder */}
          <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                type="date"
                className="h-8 text-sm w-34 border-0 bg-muted/50 focus-visible:ring-1 rounded-lg"
                {...register('due_date')}
              />
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                type="time"
                className="h-8 text-sm w-28 border-0 bg-muted/50 focus-visible:ring-1 rounded-lg"
                {...register('due_time')}
              />
            </div>
            <button
              type="button"
              onClick={() => setEmailReminder(r => !r)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ml-auto ${emailReminder ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
            >
              <Bell className="w-3 h-3" />
              {emailReminder ? 'Remind me ✓' : 'Remind me'}
            </button>
          </div>

          {/* Actions */}
          <div className="px-5 py-4 bg-muted/30 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="gradient-primary text-white border-0 px-5" disabled={createTask.isPending}>
              {createTask.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Add Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
