'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Target, Loader2, Trash2, CheckCircle2, Circle } from 'lucide-react'

const supabase = createClient()

interface Goal {
  id: string
  user_id: string
  title: string
  description?: string
  target_date?: string
  progress: number
  status: 'active' | 'completed' | 'paused'
  created_at: string
}

const statusConfig = {
  active: { label: 'Active', class: 'bg-primary/10 text-primary' },
  completed: { label: 'Done', class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
  paused: { label: 'Paused', class: 'bg-muted text-muted-foreground' },
}

export default function GoalsPage() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const queryClient = useQueryClient()

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Goal[]
    },
  })

  const createGoal = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        title: title.trim(),
        description: desc.trim() || null,
        target_date: targetDate || null,
        progress: 0,
        status: 'active',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal created!')
      setOpen(false); setTitle(''); setDesc(''); setTargetDate('')
    },
    onError: () => toast.error('Failed to create goal'),
  })

  const updateProgress = useMutation({
    mutationFn: async ({ id, progress, status }: { id: string; progress: number; status?: Goal['status'] }) => {
      const update: Partial<Goal> = { progress }
      if (status) update.status = status
      else if (progress >= 100) update.status = 'completed'
      const { error } = await supabase.from('goals').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  })

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal deleted') },
  })

  const active = goals.filter(g => g.status === 'active')
  const completed = goals.filter(g => g.status === 'completed')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? 'Loading…' : `${active.length} active · ${completed.length} completed`}
          </p>
        </div>
        <Button className="gradient-primary text-white border-0 gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> New Goal
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Target className="w-12 h-12" />
          <div className="text-center">
            <p className="font-medium text-foreground">No goals yet</p>
            <p className="text-sm mt-1">Set your first goal and start making progress</p>
          </div>
          <Button className="gradient-primary text-white border-0 gap-2 mt-2" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Create First Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal, i) => {
            const s = statusConfig[goal.status]
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-5 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        className="mt-0.5 flex-shrink-0"
                        onClick={() => updateProgress.mutate({
                          id: goal.id,
                          progress: goal.status === 'completed' ? 0 : 100,
                          status: goal.status === 'completed' ? 'active' : 'completed',
                        })}
                      >
                        {goal.status === 'completed'
                          ? <CheckCircle2 className="w-5 h-5 text-primary" />
                          : <Circle className="w-5 h-5 text-muted-foreground/40 hover:text-primary transition-colors" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${goal.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {goal.title}
                        </p>
                        {goal.description && <p className="text-sm text-muted-foreground mt-0.5">{goal.description}</p>}
                        {goal.target_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due {new Date(goal.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Badge variant="secondary" className={`text-[10px] ${s.class}`}>{s.label}</Badge>
                      <button
                        onClick={() => deleteGoal.mutate(goal.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="font-medium text-foreground">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-1.5" />
                    <input
                      type="range"
                      min={0} max={100} step={5}
                      value={goal.progress}
                      onChange={e => updateProgress.mutate({ id: goal.id, progress: Number(e.target.value) })}
                      className="w-full h-1 accent-indigo-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity -mt-2"
                    />
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>New Goal</DialogTitle>
          <form onSubmit={e => { e.preventDefault(); createGoal.mutate() }} className="space-y-4 mt-2">
            <div>
              <Label>Title</Label>
              <Input className="mt-1.5" placeholder="What do you want to achieve?" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea className="mt-1.5 resize-none" rows={2} placeholder="Why is this goal important?" value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div>
              <Label>Target Date (optional)</Label>
              <Input type="date" className="mt-1.5" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-white border-0" disabled={createGoal.isPending || !title.trim()}>
                {createGoal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
