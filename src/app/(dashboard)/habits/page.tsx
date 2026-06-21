'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Flame, CheckCircle2, Circle, Loader2, Heart, Trash2 } from 'lucide-react'

const supabase = createClient()

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6']

interface Habit {
  id: string
  user_id: string
  name: string
  description?: string
  color: string
  streak: number
  created_at: string
}

interface HabitCompletion {
  habit_id: string
  completed_date: string
}

export default function HabitsPage() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data, error } = await supabase.from('habits').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Habit[]
    },
  })

  const { data: completions = [] } = useQuery({
    queryKey: ['habit-completions', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_completions')
        .select('habit_id, completed_date')
        .eq('completed_date', today)
      if (error) throw error
      return (data ?? []) as HabitCompletion[]
    },
  })

  const completedToday = new Set(completions.map(c => c.habit_id))

  const createHabit = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('habits').insert({ name: name.trim(), description: desc.trim() || null, color, user_id: user.id, streak: 0 })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      toast.success('Habit created!')
      setOpen(false); setName(''); setDesc(''); setColor(COLORS[0])
    },
    onError: () => toast.error('Failed to create habit'),
  })

  const toggleHabit = useMutation({
    mutationFn: async (habitId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      if (completedToday.has(habitId)) {
        await supabase.from('habit_completions').delete().eq('habit_id', habitId).eq('completed_date', today)
        await supabase.from('habits').update({ streak: Math.max(0, (habits.find(h => h.id === habitId)?.streak ?? 1) - 1) }).eq('id', habitId)
      } else {
        await supabase.from('habit_completions').insert({ habit_id: habitId, user_id: user.id, completed_date: today })
        await supabase.from('habits').update({ streak: (habits.find(h => h.id === habitId)?.streak ?? 0) + 1 }).eq('id', habitId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['habit-completions', today] })
    },
  })

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('habits').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['habits'] }); toast.success('Habit deleted') },
  })

  const completedCount = habits.filter(h => completedToday.has(h.id)).length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Habits</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? 'Loading…' : `${completedCount} of ${habits.length} completed today`}
          </p>
        </div>
        <Button className="gradient-primary text-white border-0 gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> New Habit
        </Button>
      </motion.div>

      {!isLoading && habits.length > 0 && (
        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Today&apos;s Progress</span>
            <span className="text-sm font-bold text-primary">{habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: `${habits.length > 0 ? (completedCount / habits.length) * 100 : 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Heart className="w-12 h-12" />
          <div className="text-center">
            <p className="font-medium text-foreground">No habits yet</p>
            <p className="text-sm mt-1">Start building positive habits today</p>
          </div>
          <Button className="gradient-primary text-white border-0 gap-2 mt-2" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Create First Habit
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit, i) => {
            const done = completedToday.has(habit.id)
            return (
              <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`p-4 transition-all group ${done ? 'opacity-80' : ''}`}>
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleHabit.mutate(habit.id)} className="flex-shrink-0">
                      {done
                        ? <CheckCircle2 className="w-6 h-6 text-primary" />
                        : <Circle className="w-6 h-6 text-muted-foreground/40 hover:text-primary transition-colors" />
                      }
                    </button>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${done ? 'line-through text-muted-foreground' : ''}`}>{habit.name}</p>
                      {habit.description && <p className="text-xs text-muted-foreground mt-0.5">{habit.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Flame className="w-3 h-3 text-orange-500" />{habit.streak}
                      </Badge>
                      <button
                        onClick={() => deleteHabit.mutate(habit.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>New Habit</DialogTitle>
          <form onSubmit={e => { e.preventDefault(); createHabit.mutate() }} className="space-y-4 mt-2">
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" placeholder="e.g. Morning run" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input className="mt-1.5" placeholder="Why this habit?" value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1.5">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-white border-0" disabled={createHabit.isPending || !name.trim()}>
                {createHabit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
