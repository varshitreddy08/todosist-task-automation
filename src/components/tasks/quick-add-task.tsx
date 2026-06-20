'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/store/useAppStore'
import { useCreateTask } from '@/hooks/useTasks'
import { toast } from 'sonner'
import { Loader2, Calendar, Flag } from 'lucide-react'

const schema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  priority: z.enum(['p1', 'p2', 'p3', 'p4']).optional(),
  due_date: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const priorities = [
  { value: 'p1', label: 'P1', color: 'text-red-500', bg: 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50' },
  { value: 'p2', label: 'P2', color: 'text-orange-500', bg: 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50' },
  { value: 'p3', label: 'P3', color: 'text-blue-500', bg: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50' },
  { value: 'p4', label: 'P4', color: 'text-muted-foreground', bg: 'bg-muted hover:bg-muted/80' },
]

export function QuickAddTask() {
  const { quickAddOpen, setQuickAddOpen } = useAppStore()
  const [selectedPriority, setSelectedPriority] = useState<'p1' | 'p2' | 'p3' | 'p4'>('p4')
  const createTask = useCreateTask()

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'p4' }
  })

  async function onSubmit(data: FormData) {
    try {
      await createTask.mutateAsync({
        title: data.title,
        description: data.description || null,
        priority: selectedPriority,
        due_date: data.due_date || null,
        status: 'todo',
        is_recurring: false,
      })
      toast.success('Task created!')
      reset()
      setSelectedPriority('p4')
      setQuickAddOpen(false)
    } catch {
      toast.error('Failed to create task')
    }
  }

  return (
    <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Add Task</DialogTitle>
        <DialogDescription className="sr-only">Create a new task</DialogDescription>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              id="task-title"
              placeholder='e.g. "Submit report next Friday at 5 PM"'
              className="text-base border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>
          <Textarea
            placeholder="Add description (optional)"
            className="resize-none text-sm min-h-16"
            {...register('description')}
          />
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-1">
              {priorities.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setSelectedPriority(p.value as 'p1' | 'p2' | 'p3' | 'p4')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${p.bg} ${p.color} ${selectedPriority === p.value ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                >
                  <Flag className="w-3 h-3 inline-block mr-0.5" />{p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <Input type="date" className="h-7 text-xs w-32 border-0 bg-muted/50" {...register('due_date')} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose className="inline-flex items-center justify-center gap-1.5 rounded-lg h-8 px-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </DialogClose>
            <Button type="submit" className="gradient-primary text-white border-0" disabled={createTask.isPending}>
              {createTask.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
