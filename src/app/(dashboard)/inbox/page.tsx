'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCircle2, AlertCircle, Zap, Clock, Star, Loader2, Send, X, Calendar, Trash2, Mail } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

type Notification = {
  id: string
  type: 'deadline' | 'ai' | 'reminder' | 'achievement' | 'system'
  title: string
  body: string
  read: boolean
  created_at: string
}

type ScheduledEmail = {
  id: string
  to_email: string
  subject: string
  scheduled_at: string
  status: 'pending' | 'sent' | 'failed'
}

const typeConfig: Record<Notification['type'], { icon: React.ElementType; color: string; bg: string }> = {
  deadline: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  ai: { icon: Zap, color: 'text-primary', bg: 'bg-primary/10' },
  reminder: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  achievement: { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
  system: { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function InboxPage() {
  const [tab, setTab] = useState<'notifications' | 'scheduled'>('notifications')
  const [showSchedule, setShowSchedule] = useState(false)
  const [form, setForm] = useState({ to_email: '', subject: '', body: '', scheduled_at: '' })
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading: loadingNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<Notification[]>('/api/notifications'),
    refetchInterval: 30000,
  })

  const { data: scheduledEmails = [], isLoading: loadingEmails } = useQuery({
    queryKey: ['scheduled-emails'],
    queryFn: () => apiFetch<ScheduledEmail[]>('/api/scheduled-emails'),
    refetchInterval: 30000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/notifications/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: true }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllRead = useMutation({
    mutationFn: () => apiFetch('/api/notifications', { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const deleteNotif = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const scheduleEmail = useMutation({
    mutationFn: (data: typeof form) => apiFetch('/api/scheduled-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, scheduled_at: new Date(data.scheduled_at).toISOString() }),
    }),
    onSuccess: () => {
      toast.success('Email scheduled!')
      setForm({ to_email: '', subject: '', body: '', scheduled_at: '' })
      setShowSchedule(false)
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] })
    },
    onError: () => toast.error('Failed to schedule email'),
  })

  const cancelEmail = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/scheduled-emails/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Email cancelled')
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] })
    },
  })

  const unread = notifications.filter(n => !n.read).length
  const pendingEmails = scheduledEmails.filter(e => e.status === 'pending').length

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
        <div className="flex items-center gap-2">
          {unread > 0 && tab === 'notifications' && (
            <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} className="text-primary">
              Mark all read
            </Button>
          )}
          <Button className="gradient-primary text-white border-0 gap-2" size="sm" onClick={() => setShowSchedule(true)}>
            <Mail className="w-4 h-4" /> Schedule Email
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4 w-fit">
        <button onClick={() => setTab('notifications')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'notifications' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          Notifications {unread > 0 && <span className="ml-1 text-xs text-primary">({unread})</span>}
        </button>
        <button onClick={() => setTab('scheduled')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'scheduled' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          Scheduled Emails {pendingEmails > 0 && <span className="ml-1 text-xs text-primary">({pendingEmails})</span>}
        </button>
      </div>

      {/* Schedule Email Modal */}
      <AnimatePresence>
        {showSchedule && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
            <Card className="p-5 border-primary/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Schedule an Email</h3>
                <button onClick={() => setShowSchedule(false)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
              </div>
              <div className="space-y-3">
                <Input placeholder="To (email address)" type="email" value={form.to_email} onChange={e => setForm(f => ({ ...f, to_email: e.target.value }))} />
                <Input placeholder="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                <Textarea placeholder="Email body..." rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Send at</label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} min={format(new Date(), "yyyy-MM-dd'T'HH:mm")} />
                </div>
                <Button className="w-full gradient-primary text-white border-0 gap-2" onClick={() => scheduleEmail.mutate(form)} disabled={!form.to_email || !form.subject || !form.body || !form.scheduled_at || scheduleEmail.isPending}>
                  {scheduleEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Schedule Email
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="space-y-2">
          {loadingNotifs ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">AI reminders and task alerts will appear here</p>
            </div>
          ) : (
            notifications.map((notif, i) => {
              const cfg = typeConfig[notif.type] ?? typeConfig.system
              const Icon = cfg.icon
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-start gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-all cursor-pointer group ${!notif.read ? 'border-primary/30' : 'opacity-70'}`}
                  onClick={() => !notif.read && markRead.mutate(notif.id)}
                >
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!notif.read ? '' : 'text-muted-foreground'}`}>{notif.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notif.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</span>
                        <button onClick={e => { e.stopPropagation(); deleteNotif.mutate(notif.id) }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      )}

      {/* Scheduled Emails Tab */}
      {tab === 'scheduled' && (
        <div className="space-y-2">
          {loadingEmails ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : scheduledEmails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No scheduled emails</p>
              <button onClick={() => setShowSchedule(true)} className="mt-2 text-sm text-primary hover:underline">Schedule one now</button>
            </div>
          ) : (
            scheduledEmails.map((email, i) => (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 p-4 rounded-xl border bg-card"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${email.status === 'sent' ? 'bg-emerald-50 dark:bg-emerald-950/30' : email.status === 'failed' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-blue-50 dark:bg-blue-950/30'}`}>
                  <Send className={`w-5 h-5 ${email.status === 'sent' ? 'text-emerald-500' : email.status === 'failed' ? 'text-red-500' : 'text-blue-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{email.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">To: {email.to_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {email.status === 'sent' ? 'Sent' : email.status === 'failed' ? 'Failed' : 'Scheduled for'}{' '}
                        {format(new Date(email.scheduled_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={email.status === 'sent' ? 'default' : email.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                        {email.status}
                      </Badge>
                      {email.status === 'pending' && (
                        <button onClick={() => cancelEmail.mutate(email.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
