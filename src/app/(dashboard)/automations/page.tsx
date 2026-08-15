'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  MessageSquare, Brain, Zap, Plus, X, Loader2, Eye,
  Clock, CheckCircle2, XCircle, Trash2, Send, Phone, Mail,
  Lightbulb, Smile, Briefcase, Heart, AlertCircle, Sparkles,
  BellOff, BellRing, GraduationCap, Coffee, Dumbbell, Moon, ExternalLink,
  Upload, Calendar, BookOpen, FlaskConical, FileText
} from 'lucide-react'

type Automation = {
  id: string; type: 'whatsapp' | 'email_ai'
  to_phone?: string; wa_message?: string; to_email?: string
  email_subject?: string; email_body?: string; ai_prompt?: string
  scheduled_at: string; sent_at?: string; status: 'pending' | 'sent' | 'failed'; error?: string
}

type BusyMode = {
  active: boolean; message: string; ai_mode: boolean; context: string
  contacts: string; expires_at: string | null
}

type TimetableEntry = {
  day: string; subject: string; start_time: string; end_time: string; type: 'class' | 'exam' | 'lab'; branch?: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TYPE_STYLE: Record<string, { label: string; color: string; icon: React.FC<any> }> = {
  class:  { label: 'Class', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',   icon: BookOpen },
  exam:   { label: 'Exam',  color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',       icon: FileText },
  lab:    { label: 'Lab',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400', icon: FlaskConical },
}

const WA_TEMPLATES = [
  { label: 'Meeting reminder', icon: Briefcase, text: "Hey! Just a reminder about our meeting at {time}. See you there! 👋" },
  { label: 'Follow up', icon: Lightbulb, text: "Hi! Following up on our last conversation — wanted to check in and see if you had any updates? 😊" },
  { label: 'Birthday wish', icon: Smile, text: "Happy Birthday! 🎂🎉 Wishing you an amazing day filled with joy!" },
  { label: 'Check-in', icon: Heart, text: "Hey! Just checking in to see how you're doing. Hope everything is great! 💙" },
]

const TONES = [
  { value: 'professional', label: 'Professional', emoji: '👔' },
  { value: 'friendly', label: 'Friendly', emoji: '😊' },
  { value: 'casual', label: 'Casual', emoji: '😎' },
  { value: 'formal', label: 'Formal', emoji: '🎓' },
  { value: 'persuasive', label: 'Persuasive', emoji: '💡' },
]

const BUSY_PRESETS = [
  { icon: GraduationCap, label: 'In Exam', context: 'I am in exam', message: 'Hey! I am currently in an exam and cannot reply right now. I will get back to you as soon as I am done! 📚' },
  { icon: GraduationCap, label: 'In Class', context: 'I am in class', message: 'Hi! I am in class right now and cannot check my phone. Will reply after class! 📖' },
  { icon: Briefcase, label: 'In Meeting', context: 'I am in a meeting', message: 'Hey! I am in a meeting at the moment. Will get back to you shortly! 💼' },
  { icon: Moon, label: 'Sleeping', context: 'I am sleeping', message: 'I am currently asleep 😴 Will reply in the morning!' },
  { icon: Dumbbell, label: 'Working Out', context: 'I am working out', message: 'At the gym right now 💪 Will reply when I am done!' },
  { icon: Coffee, label: 'Busy', context: 'I am busy', message: 'Hey! I am a bit busy right now. Will reply soon! 🙏' },
]

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const minSchedule = () => { const d = new Date(Date.now() + 2 * 60000); return format(d, "yyyy-MM-dd'T'HH:mm") }

export default function AutomationsPage() {
  const [tab, setTab] = useState<'busy' | 'whatsapp' | 'email_ai'>('busy')
  const [step, setStep] = useState<'list' | 'form'>('list')
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)
  const [fixingText, setFixingText] = useState(false)
  const queryClient = useQueryClient()

  const [waForm, setWaForm] = useState({ to_phone: '', message: '', scheduled_at: '' })
  const [emailForm, setEmailForm] = useState({ to_email: '', recipient_name: '', ai_prompt: '', tone: 'professional', scheduled_at: '' })
  const [busyForm, setBusyForm] = useState({ message: '', context: '', ai_mode: false, expires_at: '', contacts: 'all' })
  const [parsedEntries, setParsedEntries] = useState<TimetableEntry[]>([])
  const [parsingTimetable, setParsingTimetable] = useState(false)
  const [showTimetable, setShowTimetable] = useState(false)
  const [detectedBranches, setDetectedBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => apiFetch<Automation[]>('/api/automations'),
    refetchInterval: 30000,
  })

  const { data: busyMode } = useQuery({
    queryKey: ['busy-mode'],
    queryFn: () => fetch('/api/whatsapp/busy-mode').then(r => r.ok ? r.json() : null),
    refetchInterval: 10000,
  })

  const { data: savedSchedule = [] } = useQuery<TimetableEntry[]>({
    queryKey: ['class-schedule'],
    queryFn: () => fetch('/api/class-schedule').then(r => r.ok ? r.json() : []),
  })

  const { data: activeSession } = useQuery<TimetableEntry | null>({
    queryKey: ['class-schedule-active'],
    queryFn: () => fetch('/api/class-schedule/active').then(r => r.ok ? r.json() : null),
    refetchInterval: 60000,
  })

  const saveBusy = useMutation({
    mutationFn: (data: any) => apiFetch('/api/whatsapp/busy-mode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
    onSuccess: () => { toast.success('Busy mode activated! 🔕'); queryClient.invalidateQueries({ queryKey: ['busy-mode'] }) },
    onError: () => toast.error('Failed to activate busy mode'),
  })

  const disableBusy = useMutation({
    mutationFn: () => apiFetch('/api/whatsapp/busy-mode', { method: 'DELETE' }),
    onSuccess: () => { toast.success('Busy mode disabled'); queryClient.invalidateQueries({ queryKey: ['busy-mode'] }) },
  })

  const scheduleWA = useMutation({
    mutationFn: () => apiFetch('/api/automations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'whatsapp', ...waForm, scheduled_at: new Date(waForm.scheduled_at).toISOString() }),
    }),
    onSuccess: () => { toast.success('WhatsApp message scheduled! ✅'); setWaForm({ to_phone: '', message: '', scheduled_at: '' }); setStep('list'); queryClient.invalidateQueries({ queryKey: ['automations'] }) },
    onError: () => toast.error('Backend not connected — deploy FastAPI first'),
  })

  const previewEmail = useMutation({
    mutationFn: () => apiFetch<{ subject: string; body: string }>('/api/automations/preview-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(emailForm),
    }),
    onSuccess: (data) => setPreview(data),
    onError: () => toast.error('AI preview failed'),
  })

  const scheduleEmail = useMutation({
    mutationFn: () => apiFetch('/api/automations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email_ai', ...emailForm, scheduled_at: new Date(emailForm.scheduled_at).toISOString() }),
    }),
    onSuccess: () => { toast.success('AI email scheduled! ✅'); setEmailForm({ to_email: '', recipient_name: '', ai_prompt: '', tone: 'professional', scheduled_at: '' }); setPreview(null); setStep('list'); queryClient.invalidateQueries({ queryKey: ['automations'] }) },
    onError: () => toast.error('Failed to schedule'),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/automations/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Cancelled'); queryClient.invalidateQueries({ queryKey: ['automations'] }) },
  })

  const saveSchedule = useMutation({
    mutationFn: (entries: TimetableEntry[]) => apiFetch('/api/class-schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries }),
    }),
    onSuccess: () => {
      toast.success('Timetable saved! Busy mode will auto-activate during class/exam times 🎓')
      queryClient.invalidateQueries({ queryKey: ['class-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['class-schedule-active'] })
    },
    onError: () => toast.error('Failed to save schedule'),
  })

  const deleteSchedule = useMutation({
    mutationFn: () => apiFetch('/api/class-schedule', { method: 'DELETE' }),
    onSuccess: () => {
      setParsedEntries([])
      setShowTimetable(false)
      toast.success('Timetable removed')
      queryClient.invalidateQueries({ queryKey: ['class-schedule'] })
    },
  })

  async function handleTimetableUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, etc.)')
      return
    }
    setParsingTimetable(true)
    setShowTimetable(true)
    setSelectedBranch(null)
    setDetectedBranches([])
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/automations/parse-timetable', { method: 'POST', body: fd })
      const { entries, error } = await res.json()
      if (error) throw new Error(error)
      if (!entries || entries.length === 0) {
        toast.error('Could not read timetable — try a clearer image')
        setShowTimetable(false)
      } else {
        setParsedEntries(entries)
        // Detect unique branches (excluding 'ALL' and undefined)
        const branches = [...new Set(
          entries.map((e: TimetableEntry) => e.branch).filter((b: string | undefined) => b && b !== 'ALL')
        )] as string[]
        setDetectedBranches(branches)
        if (branches.length <= 1) {
          // No multi-branch timetable — skip selection
          setSelectedBranch(branches[0] ?? 'ALL')
        }
        toast.success(`Found ${entries.length} sessions across ${branches.length > 1 ? branches.length + ' branches' : 'your timetable'}!`)
      }
    } catch (e: any) {
      toast.error(e?.message || 'AI parsing failed')
      setShowTimetable(false)
    } finally {
      setParsingTimetable(false)
    }
  }

  const filteredByBranch = selectedBranch && selectedBranch !== 'ALL'
    ? parsedEntries.filter(e => !e.branch || e.branch === 'ALL' || e.branch === selectedBranch)
    : parsedEntries

  const filteredAutomations = automations.filter(a => a.type === tab)
  const waChars = waForm.message.length
  const waOk = waForm.to_phone.replace(/\D/g, '').length >= 10 && waForm.message.trim().length > 0 && !!waForm.scheduled_at

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-primary" /> Automations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Busy mode, scheduled messages and AI emails</p>
        </div>
        {tab !== 'busy' && step === 'list' && (
          <Button className="gradient-primary text-white border-0 gap-2" onClick={() => setStep('form')}><Plus className="w-4 h-4" /> New</Button>
        )}
        {tab !== 'busy' && step === 'form' && (
          <Button variant="ghost" size="sm" onClick={() => { setStep('list'); setPreview(null) }}><X className="w-4 h-4 mr-1" /> Cancel</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-5">
        {[
          { key: 'busy', label: 'Busy Mode', icon: BellOff, color: 'text-orange-500' },
          { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-500' },
          { key: 'email_ai', label: 'AI Email', icon: Brain, color: 'text-primary' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key as any); setPreview(null); setStep('list') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className={`w-4 h-4 ${t.color}`} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── BUSY MODE TAB ── */}
      {tab === 'busy' && (
        <div className="space-y-4">
          {/* Status card */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${busyMode?.active ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-muted'}`}>
                  {busyMode?.active ? <BellOff className="w-5 h-5 text-orange-500" /> : <BellRing className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div>
                  <p className="font-semibold">Busy Mode</p>
                  <p className="text-xs text-muted-foreground">Auto-reply incoming WhatsApp messages</p>
                </div>
              </div>
              <Badge className={`${busyMode?.active ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-0' : 'bg-muted text-muted-foreground border-0'}`}>
                {busyMode?.active ? '🔕 Active' : '🔔 Off'}
              </Badge>
            </div>

            {busyMode?.active ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-sm text-orange-700 dark:text-orange-400">
                  <p className="font-medium mb-1">Auto-replying with:</p>
                  <p className="text-xs italic">"{busyMode.message}"</p>
                  {busyMode.expires_at && <p className="text-xs mt-1 opacity-70">Until {format(new Date(busyMode.expires_at), 'h:mm a')}</p>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
                  <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  Install the Chrome extension → it monitors WhatsApp Web and sends auto-replies automatically
                </div>
                <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => disableBusy.mutate()} disabled={disableBusy.isPending}>
                  {disableBusy.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                  Turn Off Busy Mode
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Pick a preset or write a custom message. The Chrome extension will auto-reply on WhatsApp Web.</p>

                {/* Presets */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Quick presets</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BUSY_PRESETS.map(p => (
                      <button key={p.label} onClick={() => setBusyForm(f => ({ ...f, message: p.message, context: p.context }))}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 group ${busyForm.context === p.context ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20' : 'border-dashed'}`}>
                        <p.icon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <span className="text-xs font-medium">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom message */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Auto-reply message</label>
                  <Textarea rows={3} placeholder="Type the message people will receive..." value={busyForm.message}
                    onChange={e => setBusyForm(f => ({ ...f, message: e.target.value }))} className="resize-none" />
                </div>

                {/* AI mode toggle */}
                <button
                  onClick={() => setBusyForm(f => ({ ...f, ai_mode: !f.ai_mode }))}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${busyForm.ai_mode ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border hover:border-primary/40 bg-muted/30'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${busyForm.ai_mode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold transition-colors ${busyForm.ai_mode ? 'text-primary' : 'text-foreground'}`}>AI Smart Reply</p>
                        <p className="text-xs text-muted-foreground">Personalizes reply based on who's texting</p>
                      </div>
                    </div>
                    {/* Toggle pill */}
                    <div className={`relative w-12 h-6 rounded-full flex-shrink-0 transition-all duration-300 ${busyForm.ai_mode ? 'bg-primary shadow-[0_0_8px_2px_rgba(99,102,241,0.4)]' : 'bg-muted-foreground/25'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${busyForm.ai_mode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                  {busyForm.ai_mode && (
                    <div className="mt-3 pt-3 border-t border-primary/20 flex items-start gap-2">
                      <Brain className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-primary/80 leading-relaxed">AI will read your context and craft a personalized reply for each person — using your message as a base</p>
                    </div>
                  )}
                </button>

                {/* Until time */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Active until (optional)
                  </label>
                  <Input type="datetime-local" min={minSchedule()} value={busyForm.expires_at}
                    onChange={e => setBusyForm(f => ({ ...f, expires_at: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to stay on until you turn it off manually</p>
                </div>

                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 h-11"
                  disabled={!busyForm.message.trim() || saveBusy.isPending}
                  onClick={() => saveBusy.mutate({ ...busyForm, active: true, expires_at: busyForm.expires_at ? new Date(busyForm.expires_at).toISOString() : null })}>
                  {saveBusy.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
                  Activate Busy Mode
                </Button>

                {/* WhatsApp Web shortcut */}
                <a href="https://web.whatsapp.com" target="_blank" rel="noopener"
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-lg border border-dashed hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors text-sm text-muted-foreground hover:text-green-600">
                  <MessageSquare className="w-4 h-4" /> Open WhatsApp Web <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </Card>

          {/* ── SMART TIMETABLE CARD ── */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="font-semibold">Smart Timetable</p>
                  <p className="text-xs text-muted-foreground">AI reads your schedule → auto-activates busy mode</p>
                </div>
              </div>
              {savedSchedule.length > 0 && (
                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-0 text-xs">
                  {savedSchedule.length} sessions
                </Badge>
              )}
            </div>

            {/* Active session banner */}
            {activeSession && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                    In {activeSession.type} right now — {activeSession.subject}
                  </p>
                  <p className="text-xs text-red-600/70 dark:text-red-500/70">{activeSession.start_time} – {activeSession.end_time}</p>
                </div>
                <Badge className={`text-xs border-0 flex-shrink-0 ${TYPE_STYLE[activeSession.type]?.color}`}>
                  {activeSession.type}
                </Badge>
              </div>
            )}

            {/* Saved schedule list */}
            {savedSchedule.length > 0 && !showTimetable && (
              <div className="mb-4 space-y-3">
                {DAYS.filter(d => savedSchedule.some(e => e.day === d)).map(day => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{day}</p>
                    <div className="space-y-1.5">
                      {savedSchedule.filter(e => e.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time)).map((entry, i) => {
                        const style = TYPE_STYLE[entry.type] || TYPE_STYLE.class
                        const Icon = style.icon
                        return (
                          <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium flex-1 truncate">{entry.subject}</span>
                            <span className="text-xs text-muted-foreground font-mono">{entry.start_time}–{entry.end_time}</span>
                            <Badge className={`text-xs border-0 ${style.color}`}>{style.label}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => { setParsedEntries(savedSchedule); setShowTimetable(true) }}>
                    <Upload className="w-3.5 h-3.5" /> Upload New
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-1.5"
                    onClick={() => deleteSchedule.mutate()} disabled={deleteSchedule.isPending}>
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Upload + parse state */}
            {(savedSchedule.length === 0 || showTimetable) && !parsingTimetable && parsedEntries.length === 0 && (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleTimetableUpload(f); e.target.value = '' }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl p-8 flex flex-col items-center gap-3 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/40 flex items-center justify-center transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Upload your class timetable</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG — AI will read and extract all class & exam times</p>
                  </div>
                </button>
              </>
            )}

            {/* Parsing loader */}
            {parsingTimetable && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">AI is reading your timetable...</p>
                  <p className="text-xs text-muted-foreground mt-1">Extracting class names, days, and times</p>
                </div>
              </div>
            )}

            {/* Parsed results */}
            {!parsingTimetable && parsedEntries.length > 0 && showTimetable && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">Found {parsedEntries.length} sessions — review and save</p>
                </div>

                {/* Branch selector — only shown when multiple branches detected */}
                {detectedBranches.length > 1 && (
                  <div className="p-3 rounded-xl border-2 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" /> Multiple branches detected — which one are you in?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detectedBranches.map(branch => (
                        <button
                          key={branch}
                          onClick={() => setSelectedBranch(branch)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selectedBranch === branch
                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                            : 'border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/40'}`}
                        >
                          {branch}
                        </button>
                      ))}
                    </div>
                    {selectedBranch && (
                      <p className="text-xs text-indigo-600/70 dark:text-indigo-500/70">
                        Showing {filteredByBranch.length} sessions for <strong>{selectedBranch}</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Session list — gated on branch selection when multi-branch */}
                {(detectedBranches.length <= 1 || selectedBranch) && (
                  <>
                    <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                      {DAYS.filter(d => filteredByBranch.some(e => e.day === d)).map(day => (
                        <div key={day}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 sticky top-0 bg-background">{day}</p>
                          <div className="space-y-1.5">
                            {filteredByBranch.filter(e => e.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time)).map((entry, i) => {
                              const style = TYPE_STYLE[entry.type] || TYPE_STYLE.class
                              const Icon = style.icon
                              return (
                                <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 group">
                                  <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm font-medium flex-1 truncate">{entry.subject}</span>
                                  <span className="text-xs text-muted-foreground font-mono">{entry.start_time}–{entry.end_time}</span>
                                  <Badge className={`text-xs border-0 ${style.color}`}>{style.label}</Badge>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="gap-1.5"
                        onClick={() => { setParsedEntries([]); setShowTimetable(false); setDetectedBranches([]); setSelectedBranch(null); fileInputRef.current?.click() }}>
                        <Upload className="w-3.5 h-3.5" /> Re-upload
                      </Button>
                      <Button className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white gap-2"
                        onClick={() => saveSchedule.mutate(filteredByBranch)} disabled={saveSchedule.isPending || filteredByBranch.length === 0}>
                        {saveSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Save {selectedBranch ? `${selectedBranch} ` : ''}Schedule
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Extension reminder */}
          <Card className="p-4 border-dashed">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">How auto-reply works</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  1. Activate Busy Mode above with your message<br />
                  2. Open <a href="https://web.whatsapp.com" target="_blank" className="text-primary hover:underline">WhatsApp Web</a> in Chrome<br />
                  3. The TaskFlow Chrome extension detects incoming messages and auto-replies<br />
                  4. Only selected contacts get the auto-reply (or everyone if set to All)
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── WHATSAPP / EMAIL TABS ── */}
      {tab !== 'busy' && (
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              {tab === 'whatsapp' && (
                <Card className="p-5 space-y-5">
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-green-600" /></div>
                    <div><p className="font-semibold">Schedule WhatsApp Message</p><p className="text-xs text-muted-foreground">Sends from your connected WhatsApp (Green API)</p></div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone number</label>
                    <Input placeholder="+91 98765 43210" value={waForm.to_phone} onChange={e => setWaForm(f => ({ ...f, to_phone: e.target.value }))} className="font-mono" />
                    <p className="text-xs text-muted-foreground mt-1">Include country code (e.g. +91 for India)</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Quick templates</p>
                    <div className="grid grid-cols-2 gap-2">
                      {WA_TEMPLATES.map(t => (
                        <button key={t.label} onClick={() => setWaForm(f => ({ ...f, message: t.text }))}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors text-left group">
                          <t.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-green-600 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground group-hover:text-foreground">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium">Message</label>
                      <div className="flex items-center gap-2">
                        <button onClick={async () => {
                          if (!waForm.message.trim()) return
                          setFixingText(true)
                          try {
                            const res = await fetch('/api/ai/fix-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: waForm.message, type: 'message' }) })
                            const { fixed } = await res.json()
                            setWaForm(f => ({ ...f, message: fixed }))
                            toast.success('AI fixed your message!')
                          } catch { toast.error('AI fix failed') }
                          setFixingText(false)
                        }} disabled={!waForm.message.trim() || fixingText}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 transition-colors font-medium">
                          {fixingText ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Fix with AI
                        </button>
                        <span className={`text-xs ${waChars > 1000 ? 'text-red-500' : 'text-muted-foreground'}`}>{waChars}/1000</span>
                      </div>
                    </div>
                    <Textarea placeholder="Type your message here..." rows={4} value={waForm.message}
                      onChange={e => setWaForm(f => ({ ...f, message: e.target.value.slice(0, 1000) }))} className="resize-none" />
                    <p className="text-xs text-muted-foreground mt-1">💡 Use {'{time}'}, {'{name}'} as placeholders</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" /> Send at</label>
                    <Input type="datetime-local" min={minSchedule()} value={waForm.scheduled_at} onChange={e => setWaForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                  </div>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 h-11" onClick={() => scheduleWA.mutate()} disabled={!waOk || scheduleWA.isPending}>
                    {scheduleWA.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Schedule WhatsApp Message
                  </Button>
                </Card>
              )}

              {tab === 'email_ai' && (
                <Card className="p-5 space-y-5">
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Brain className="w-5 h-5 text-primary" /></div>
                    <div><p className="font-semibold">AI-Written Email</p><p className="text-xs text-muted-foreground">Describe what you want to say — AI drafts it</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> To email</label>
                      <Input type="email" placeholder="friend@email.com" value={emailForm.to_email} onChange={e => setEmailForm(f => ({ ...f, to_email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5">Their name</label>
                      <Input placeholder="John" value={emailForm.recipient_name} onChange={e => setEmailForm(f => ({ ...f, recipient_name: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">What should the email be about?</label>
                    <Textarea placeholder="e.g. Remind John about the project deadline on Friday" rows={3} value={emailForm.ai_prompt}
                      onChange={e => setEmailForm(f => ({ ...f, ai_prompt: e.target.value }))} className="resize-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tone</label>
                    <div className="flex flex-wrap gap-2">
                      {TONES.map(t => (
                        <button key={t.value} onClick={() => setEmailForm(f => ({ ...f, tone: t.value }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${emailForm.tone === t.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 text-muted-foreground'}`}>
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" /> Send at</label>
                    <Input type="datetime-local" min={minSchedule()} value={emailForm.scheduled_at} onChange={e => setEmailForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                  </div>
                  <Button variant="outline" className="w-full gap-2" onClick={() => { setPreview(null); previewEmail.mutate() }}
                    disabled={!emailForm.to_email || !emailForm.ai_prompt || previewEmail.isPending}>
                    {previewEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview AI Draft
                  </Button>
                  <AnimatePresence>
                    {preview && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="rounded-xl bg-muted/50 border p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /> AI Draft</p>
                            <button className="text-xs text-muted-foreground hover:text-primary" onClick={() => { setPreview(null); previewEmail.mutate() }}>↺ Regenerate</button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Subject:</p>
                            <p className="text-sm font-medium">{preview.subject}</p>
                            <p className="text-xs text-muted-foreground border-t pt-2">Body:</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{preview.body}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button className="w-full gradient-primary text-white border-0 gap-2 h-11" onClick={() => scheduleEmail.mutate()}
                    disabled={!emailForm.to_email || !emailForm.ai_prompt || !emailForm.scheduled_at || scheduleEmail.isPending}>
                    {scheduleEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Schedule AI Email
                  </Button>
                </Card>
              )}
            </motion.div>
          )}

          {step === 'list' && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {isLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : filteredAutomations.length === 0 ? (
                <div className="text-center py-20">
                  <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${tab === 'whatsapp' ? 'bg-green-50 dark:bg-green-950/30' : 'bg-primary/10'}`}>
                    {tab === 'whatsapp' ? <MessageSquare className="w-8 h-8 text-green-600" /> : <Brain className="w-8 h-8 text-primary" />}
                  </div>
                  <p className="font-medium mb-1">No {tab === 'whatsapp' ? 'WhatsApp messages' : 'AI emails'} scheduled</p>
                  <p className="text-sm text-muted-foreground mb-5">{tab === 'whatsapp' ? 'Schedule a WhatsApp message to send at any time' : 'Let AI write and send an email for you'}</p>
                  <Button className="gradient-primary text-white border-0 gap-2" onClick={() => setStep('form')}><Plus className="w-4 h-4" /> Schedule now</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAutomations.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.status === 'sent' ? 'bg-emerald-50 dark:bg-emerald-950/30' : item.status === 'failed' ? 'bg-red-50 dark:bg-red-950/30' : tab === 'whatsapp' ? 'bg-green-50 dark:bg-green-950/30' : 'bg-primary/10'}`}>
                            {tab === 'whatsapp' ? <MessageSquare className={`w-5 h-5 ${item.status === 'sent' ? 'text-emerald-500' : item.status === 'failed' ? 'text-red-500' : 'text-green-600'}`} /> : <Brain className={`w-5 h-5 ${item.status === 'sent' ? 'text-emerald-500' : item.status === 'failed' ? 'text-red-500' : 'text-primary'}`} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{tab === 'whatsapp' ? item.to_phone : (item.email_subject || 'AI will generate subject')}</p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{tab === 'whatsapp' ? item.wa_message : item.to_email}</p>
                                {item.error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{item.error}</p>}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge className={`text-xs gap-1 ${item.status === 'sent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0' : item.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-0' : 'bg-muted text-muted-foreground border-0'}`}>
                                  {item.status === 'sent' ? <CheckCircle2 className="w-3 h-3" /> : item.status === 'failed' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                  {item.status}
                                </Badge>
                                {item.status === 'pending' && (
                                  <button onClick={() => cancel.mutate(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.status === 'sent' && item.sent_at ? `Sent ${format(new Date(item.sent_at), 'MMM d, h:mm a')}` : `Sends ${format(new Date(item.scheduled_at), 'MMM d, h:mm a')}`}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
