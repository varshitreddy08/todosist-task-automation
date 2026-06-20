'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { Bell, CheckCircle2, UserPlus, AlertCircle, Zap, Clock, Star } from 'lucide-react'
import { format } from 'date-fns'

const notifs = [
  { id: '1', type: 'deadline', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', title: 'Deadline approaching', body: '"Quarterly Report" is due in 2 hours', time: '2h ago', read: false },
  { id: '2', type: 'assignment', icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', title: 'Task assigned', body: 'Sarah assigned "Review UI mockups" to you', time: '3h ago', read: false },
  { id: '3', type: 'ai', icon: Zap, color: 'text-primary', bg: 'bg-primary/10', title: 'AI Insight', body: 'You complete 40% more tasks in the morning. Consider scheduling hard tasks before noon.', time: '5h ago', read: false },
  { id: '4', type: 'complete', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', title: 'Project milestone reached', body: '"Design Sprint" is now 75% complete!', time: '1d ago', read: true },
  { id: '5', type: 'reminder', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', title: 'Recurring task due', body: '"Daily standup" starts in 30 minutes', time: '1d ago', read: true },
  { id: '6', type: 'achievement', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30', title: 'Achievement unlocked!', body: '10-day streak! You\'re on a roll 🔥', time: '2d ago', read: true },
]

export default function InboxPage() {
  const [items, setItems] = useState(notifs)

  const unread = items.filter(n => !n.read).length

  function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  function markRead(id: string) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Inbox
            {unread > 0 && <Badge className="gradient-primary text-white border-0">{unread}</Badge>}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{unread} unread notification{unread !== 1 ? 's' : ''}</p>
        </div>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-primary">
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((notif, i) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-start gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-all cursor-pointer ${!notif.read ? 'border-primary/30 bg-primary/2' : 'opacity-70'}`}
            onClick={() => markRead(notif.id)}
          >
            <div className={`w-9 h-9 rounded-xl ${notif.bg} flex items-center justify-center flex-shrink-0`}>
              <notif.icon className={`w-5 h-5 ${notif.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium ${!notif.read ? '' : 'text-muted-foreground'}`}>{notif.title}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!notif.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                  <span className="text-xs text-muted-foreground">{notif.time}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
