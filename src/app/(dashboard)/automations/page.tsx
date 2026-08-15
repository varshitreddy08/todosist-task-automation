'use client'
import { useState } from 'react'
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
  Clock, CheckCircle2, XCircle, Trash2, Send, ChevronRight,
  Phone, Mail, Lightbulb, Smile, Briefcase, Heart, AlertCircle
} from 'lucide-react'

type Automation = {
  id: string
  type: 'whatsapp' | 'email_ai'
  to_phone?: string
  wa_message?: string
  to_email?: string
  email_subject?: string
  email_body?: string
  ai_prompt?: string
  scheduled_at: string
  sent_at?: string
  status: 'pending' | 'sent' | 'failed'
  error?: string
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

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const minSchedule = () => {
  const d = new Date(Date.now() + 2 * 60000)
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

export default function AutomationsPage() {
  const [tab, setTab] = useState<'whatsapp' | 'email_ai'>('whatsapp')
  const [step, setStep] = useState<'list' | 'form'>('list')
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)
  const queryClient = useQueryClient()

  const [waForm, setWaForm] = useState({ to_phone: '', message: '', scheduled_at: '' })
  const [emailForm, setEmailForm] = useState({ to_email: '', recipient_name: '', ai_prompt: '', tone: 'professional', scheduled_at: '' })

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => apiFetch<Automation[]>('/api/automations'),
    refetchInterval: 30000,
  })

  const scheduleWA = useMutation({
    mutationFn: () => apiFetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'whatsapp', ...waForm, scheduled_at: new Date(waForm.scheduled_at).toISOString() }),
    }),
    onSuccess: () => {
      toast.success('WhatsApp message scheduled! ✅')
      setWaForm({ to_phone: '', message: '', scheduled_at: '' })
      setStep('list')
      queryClient.invalidateQueries({ queryKey: ['automations'] })
    },
    onError: () => toast.error('Backend not connected yet — deploy FastAPI first'),
  })

  const previewEmail = useMutation({
    mutationFn: () => apiFetch<{ subject: string; body: string }>('/api/automations/preview-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailForm),
    }),
    onSuccess: (data) => setPreview(data),
    onError: () => toast.error('AI preview failed — check backend connection'),
  })

  const scheduleEmail = useMutation({
    mutationFn: () => apiFetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email_ai', ...emailForm, scheduled_at: new Date(emailForm.scheduled_at).toISOString() }),
    }),
    onSuccess: () => {
      toast.success('AI email scheduled! ✅')
      setEmailForm({ to_email: '', recipient_name: '', ai_prompt: '', tone: 'professional', scheduled_at: '' })
      setPreview(null)
      setStep('list')
      queryClient.invalidateQueries({ queryKey: ['automations'] })
    },
    onError: () => toast.error('Failed to schedule'),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/automations/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Cancelled'); queryClient.invalidateQueries({ queryKey: ['automations'] }) },
  })

  const filteredAutomations = automations.filter(a => a.type === tab)
  const waChars = waForm.message.length
  const waOk = waForm.to_phone.replace(/\D/g, '').length >= 10 && waForm.message.trim().length > 0 && !!waForm.scheduled_at

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" /> Automations
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Schedule messages and emails to send automatically</p>
        </div>
        {step === 'list' && (
          <Button className="gradient-primary text-white border-0 gap-2" onClick={() => setStep('form')}>
            <Plus className="w-4 h-4" /> New
          </Button>
        )}
        {step === 'form' && (
          <Button variant="ghost" size="sm" onClick={() => { setStep('list'); setPreview(null) }}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-5">
        <button
          onClick={() => { setTab('whatsapp'); setPreview(null) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'whatsapp' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <MessageSquare className="w-4 h-4 text-green-500" /> WhatsApp
        </button>
        <button
          onClick={() => { setTab('email_ai'); setPreview(null) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'email_ai' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Brain className="w-4 h-4 text-primary" /> AI Email
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ── FORM ── */}
        {step === 'form' && (
          <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>

            {tab === 'whatsapp' && (
              <Card className="p-5 space-y-5">
                <div className="flex items-center gap-3 pb-2 border-b">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Schedule WhatsApp Message</p>
                    <p className="text-xs text-muted-foreground">Sends from your connected WhatsApp number</p>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone number
                  </label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={waForm.to_phone}
                    onChange={e => setWaForm(f => ({ ...f, to_phone: e.target.value }))}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Include country code (e.g. +91 for India, +1 for US)</p>
                </div>

                {/* Quick templates */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Quick templates</p>
                  <div className="grid grid-cols-2 gap-2">
                    {WA_TEMPLATES.map(t => (
                      <button
                        key={t.label}
                        onClick={() => setWaForm(f => ({ ...f, message: t.text }))}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors text-left group"
                      >
                        <t.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-green-600 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground group-hover:text-foreground">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium">Message</label>
                    <span className={`text-xs ${waChars > 1000 ? 'text-red-500' : 'text-muted-foreground'}`}>{waChars}/1000</span>
                  </div>
                  <Textarea
                    placeholder="Type your message here..."
                    rows={4}
                    value={waForm.message}
                    onChange={e => setWaForm(f => ({ ...f, message: e.target.value.slice(0, 1000) }))}
                    className="resize-none"
                  />
                </div>

                {/* Schedule time */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Send at
                  </label>
                  <Input
                    type="datetime-local"
                    min={minSchedule()}
                    value={waForm.scheduled_at}
                    onChange={e => setWaForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  />
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 h-11"
                  onClick={() => scheduleWA.mutate()}
                  disabled={!waOk || scheduleWA.isPending}
                >
                  {scheduleWA.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Schedule WhatsApp Message
                </Button>
              </Card>
            )}

            {tab === 'email_ai' && (
              <Card className="p-5 space-y-5">
                <div className="flex items-center gap-3 pb-2 border-b">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">AI-Written Email</p>
                    <p className="text-xs text-muted-foreground">Describe what you want to say — AI drafts it for you</p>
                  </div>
                </div>

                {/* Recipient */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" /> To email
                    </label>
                    <Input type="email" placeholder="friend@email.com" value={emailForm.to_email} onChange={e => setEmailForm(f => ({ ...f, to_email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5">Their name</label>
                    <Input placeholder="John" value={emailForm.recipient_name} onChange={e => setEmailForm(f => ({ ...f, recipient_name: e.target.value }))} />
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">What should the email be about?</label>
                  <Textarea
                    placeholder="e.g. Remind John about the project deadline on Friday, mention we need the designs by EOD Thursday"
                    rows={3}
                    value={emailForm.ai_prompt}
                    onChange={e => setEmailForm(f => ({ ...f, ai_prompt: e.target.value }))}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">The more detail you give, the better the email</p>
                </div>

                {/* Tone picker */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setEmailForm(f => ({ ...f, tone: t.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${emailForm.tone === t.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'}`}
                      >
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Send at
                  </label>
                  <Input type="datetime-local" min={minSchedule()} value={emailForm.scheduled_at} onChange={e => setEmailForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                </div>

                {/* Preview button */}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => { setPreview(null); previewEmail.mutate() }}
                  disabled={!emailForm.to_email || !emailForm.ai_prompt || previewEmail.isPending}
                >
                  {previewEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  Preview AI Draft
                </Button>

                {/* Preview card */}
                <AnimatePresence>
                  {preview && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="rounded-xl bg-muted/50 border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5" /> AI Draft
                          </p>
                          <button className="text-xs text-muted-foreground hover:text-primary" onClick={() => { setPreview(null); previewEmail.mutate() }}>
                            ↺ Regenerate
                          </button>
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

                <Button
                  className="w-full gradient-primary text-white border-0 gap-2 h-11"
                  onClick={() => scheduleEmail.mutate()}
                  disabled={!emailForm.to_email || !emailForm.ai_prompt || !emailForm.scheduled_at || scheduleEmail.isPending}
                >
                  {scheduleEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Schedule AI Email
                </Button>
              </Card>
            )}
          </motion.div>
        )}

        {/* ── LIST ── */}
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
                <p className="text-sm text-muted-foreground mb-5">
                  {tab === 'whatsapp'
                    ? 'Schedule a WhatsApp message to send at any time'
                    : 'Let AI write and send an email for you at the perfect time'}
                </p>
                <Button className="gradient-primary text-white border-0 gap-2" onClick={() => setStep('form')}>
                  <Plus className="w-4 h-4" /> Schedule now
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAutomations.map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          item.status === 'sent' ? 'bg-emerald-50 dark:bg-emerald-950/30' :
                          item.status === 'failed' ? 'bg-red-50 dark:bg-red-950/30' :
                          tab === 'whatsapp' ? 'bg-green-50 dark:bg-green-950/30' : 'bg-primary/10'
                        }`}>
                          {tab === 'whatsapp'
                            ? <MessageSquare className={`w-5 h-5 ${item.status === 'sent' ? 'text-emerald-500' : item.status === 'failed' ? 'text-red-500' : 'text-green-600'}`} />
                            : <Brain className={`w-5 h-5 ${item.status === 'sent' ? 'text-emerald-500' : item.status === 'failed' ? 'text-red-500' : 'text-primary'}`} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {tab === 'whatsapp' ? item.to_phone : (item.email_subject || 'AI will generate subject')}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {tab === 'whatsapp' ? item.wa_message : item.to_email}
                              </p>
                              {item.ai_prompt && (
                                <p className="text-xs text-muted-foreground italic truncate mt-0.5 max-w-xs">"{item.ai_prompt}"</p>
                              )}
                              {item.error && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{item.error}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge
                                className={`text-xs gap-1 ${item.status === 'sent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0' : item.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-0' : 'bg-muted text-muted-foreground border-0'}`}
                              >
                                {item.status === 'sent' ? <CheckCircle2 className="w-3 h-3" /> : item.status === 'failed' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {item.status}
                              </Badge>
                              {item.status === 'pending' && (
                                <button onClick={() => cancel.mutate(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.status === 'sent' && item.sent_at
                              ? `Sent ${format(new Date(item.sent_at), 'MMM d, h:mm a')}`
                              : `Sends ${format(new Date(item.scheduled_at), 'MMM d, h:mm a')}`
                            }
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
    </div>
  )
}
