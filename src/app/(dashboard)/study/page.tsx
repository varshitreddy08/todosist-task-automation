'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  BookOpen, Brain, Clock, Play, Pause, RotateCcw, Plus, Check,
  ChevronRight, Layers, Trash2, X, Loader2, BarChart3, Flame,
  ThumbsUp, ThumbsDown, Minus, Star
} from 'lucide-react'

type StudySession = { id: string; subject: string; duration_minutes: number; notes?: string; created_at: string }
type Deck = { id: string; name: string; subject?: string; created_at: string }
type Flashcard = { id: string; deck_id: string; front: string; back: string; due_date?: string; interval_days: number }

const SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'History', 'English', 'CS', 'Economics', 'Other']
const SUBJECT_COLORS: Record<string, string> = {
  Math: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  Physics: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  Chemistry: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  Biology: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  History: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  English: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400',
  CS: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  Economics: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  Other: 'bg-muted text-muted-foreground',
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function StudyPage() {
  const [tab, setTab] = useState<'timer' | 'flashcards' | 'history'>('timer')
  const queryClient = useQueryClient()

  // ── Timer state ──
  const [subject, setSubject] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [sessionNote, setSessionNote] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(0)

  // ── Flashcard state ──
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [showNewDeck, setShowNewDeck] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [deckSubject, setDeckSubject] = useState('')
  const [showAddCard, setShowAddCard] = useState(false)
  const [cardFront, setCardFront] = useState('')
  const [cardBack, setCardBack] = useState('')

  const { data: sessions = [] } = useQuery({
    queryKey: ['study-sessions'],
    queryFn: () => apiFetch<StudySession[]>('/api/study'),
  })

  const { data: decks = [] } = useQuery({
    queryKey: ['flashcard-decks'],
    queryFn: () => apiFetch<Deck[]>('/api/flashcards'),
  })

  const { data: deckCards = [] } = useQuery({
    queryKey: ['flashcards', selectedDeck?.id],
    queryFn: () => selectedDeck ? apiFetch<Flashcard[]>(`/api/flashcards?deckId=${selectedDeck.id}`) : Promise.resolve([]),
    enabled: !!selectedDeck,
  })

  useEffect(() => {
    if (running) {
      startedRef.current = Date.now() - seconds * 1000
      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedRef.current) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running])

  const saveSession = useMutation({
    mutationFn: () => apiFetch<StudySession>('/api/study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: customSubject || subject,
        duration_minutes: Math.max(1, Math.round(seconds / 60)),
        notes: sessionNote || null,
      }),
    }),
    onSuccess: () => {
      toast.success(`Session saved! ${Math.round(seconds / 60)} min of ${customSubject || subject}`)
      setSeconds(0); setRunning(false); setSessionNote(''); setCustomSubject('')
      queryClient.invalidateQueries({ queryKey: ['study-sessions'] })
    },
  })

  const createDeck = useMutation({
    mutationFn: () => apiFetch<Deck>('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'deck', name: deckName, subject: deckSubject }),
    }),
    onSuccess: (deck) => {
      setShowNewDeck(false); setDeckName(''); setDeckSubject('')
      queryClient.invalidateQueries({ queryKey: ['flashcard-decks'] })
      setSelectedDeck(deck)
    },
  })

  const addCard = useMutation({
    mutationFn: () => apiFetch<Flashcard>('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deck_id: selectedDeck!.id, front: cardFront, back: cardBack }),
    }),
    onSuccess: () => {
      setCardFront(''); setCardBack(''); setShowAddCard(false)
      toast.success('Card added!')
      queryClient.invalidateQueries({ queryKey: ['flashcards', selectedDeck?.id] })
    },
  })

  const rateCard = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) => apiFetch<Flashcard>('/api/flashcards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, rating }),
    }),
    onSuccess: () => {
      const next = reviewIndex + 1
      if (next >= reviewCards.length) {
        toast.success('Review complete! 🎉')
        setReviewMode(false); setReviewIndex(0)
      } else {
        setReviewIndex(next); setShowBack(false)
      }
    },
  })

  const deleteDeck = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/flashcards?id=${id}&type=deck`, { method: 'DELETE' }),
    onSuccess: () => { setSelectedDeck(null); queryClient.invalidateQueries({ queryKey: ['flashcard-decks'] }) },
  })

  async function startReview() {
    const cards = await apiFetch<Flashcard[]>(`/api/flashcards?deckId=${selectedDeck!.id}&review=1`)
    if (!cards.length) { toast.info('No cards due for review today!'); return }
    setReviewCards(cards); setReviewIndex(0); setShowBack(false); setReviewMode(true)
  }

  const subjectLabel = customSubject || subject
  const totalMinutesToday = sessions.filter(s => s.created_at.startsWith(new Date().toISOString().split('T')[0])).reduce((a, s) => a + s.duration_minutes, 0)
  const uniqueSubjects = [...new Set(sessions.map(s => s.subject))]
  const currentCard = reviewCards[reviewIndex]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" /> Study Hub</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Track study sessions, review flashcards, and stay consistent</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{totalMinutesToday}m</p>
          <p className="text-xs text-muted-foreground">Today</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{sessions.length}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{uniqueSubjects.length}</p>
          <p className="text-xs text-muted-foreground">Subjects</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-5">
        {([['timer', 'Timer', Clock], ['flashcards', 'Flashcards', Layers], ['history', 'History', BarChart3]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── TIMER TAB ── */}
        {tab === 'timer' && (
          <motion.div key="timer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Subject picker */}
            <Card className="p-4">
              <p className="text-sm font-medium mb-3">What are you studying?</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {SUBJECTS.map(s => (
                  <button key={s} onClick={() => { setSubject(s); setCustomSubject('') }} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${subject === s && !customSubject ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <Input placeholder="Or type your own subject..." value={customSubject} onChange={e => { setCustomSubject(e.target.value); setSubject('') }} className="text-sm" />
            </Card>

            {/* Timer display */}
            <Card className="p-8 text-center">
              <div className="text-7xl font-mono font-bold tracking-tight text-primary mb-6">
                {formatTime(seconds)}
              </div>
              {subjectLabel && (
                <Badge className={`mb-6 ${SUBJECT_COLORS[subjectLabel] ?? SUBJECT_COLORS.Other}`}>{subjectLabel}</Badge>
              )}
              <div className="flex items-center justify-center gap-3">
                <Button size="lg" onClick={() => setRunning(v => !v)} className={`w-32 gap-2 ${running ? 'bg-orange-500 hover:bg-orange-600 text-white border-0' : 'gradient-primary text-white border-0'}`} disabled={!subjectLabel}>
                  {running ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> {seconds > 0 ? 'Resume' : 'Start'}</>}
                </Button>
                {seconds > 0 && !running && (
                  <Button size="lg" variant="outline" onClick={() => { setSeconds(0); setRunning(false) }} className="gap-2">
                    <RotateCcw className="w-4 h-4" /> Reset
                  </Button>
                )}
              </div>

              {seconds > 30 && !running && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-3">
                  <Textarea placeholder="Add notes (optional)..." value={sessionNote} onChange={e => setSessionNote(e.target.value)} rows={2} className="text-sm" />
                  <Button className="gradient-primary text-white border-0 gap-2 w-full" onClick={() => saveSession.mutate()} disabled={saveSession.isPending}>
                    {saveSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Session ({Math.round(seconds / 60)} min)
                  </Button>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ── FLASHCARDS TAB ── */}
        {tab === 'flashcards' && (
          <motion.div key="cards" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Review mode */}
            {reviewMode && currentCard ? (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">Card {reviewIndex + 1} of {reviewCards.length}</p>
                  <button onClick={() => { setReviewMode(false); setReviewIndex(0) }}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
                </div>
                <Progress value={((reviewIndex) / reviewCards.length) * 100} className="h-1 mb-6" />

                <div className="min-h-32 flex items-center justify-center text-center cursor-pointer" onClick={() => setShowBack(true)}>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Front</p>
                    <p className="text-xl font-semibold">{currentCard.front}</p>
                  </div>
                </div>

                <AnimatePresence>
                  {showBack && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                      <div className="border-t pt-4 mb-4 text-center">
                        <p className="text-xs text-muted-foreground mb-2">Answer</p>
                        <p className="text-lg text-primary font-medium">{currentCard.back}</p>
                      </div>
                      <p className="text-xs text-center text-muted-foreground mb-3">How well did you know this?</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[{ r: 1, label: 'Again', cls: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400', icon: RotateCcw },
                          { r: 2, label: 'Hard', cls: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950/40 dark:text-orange-400', icon: Minus },
                          { r: 3, label: 'Good', cls: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-400', icon: ThumbsUp },
                          { r: 4, label: 'Easy', cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400', icon: Star },
                        ].map(({ r, label, cls, icon: Icon }) => (
                          <button key={r} onClick={() => rateCard.mutate({ id: currentCard.id, rating: r })} disabled={rateCard.isPending} className={`flex flex-col items-center gap-1 p-2.5 rounded-lg text-xs font-medium border-0 transition-colors ${cls}`}>
                            <Icon className="w-4 h-4" /> {label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!showBack && <p className="text-center text-xs text-muted-foreground mt-4">Tap card to reveal answer</p>}
              </Card>
            ) : (
              <>
                {/* Deck list */}
                {!selectedDeck ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Your Decks</p>
                      <Button size="sm" className="gradient-primary text-white border-0 gap-1.5" onClick={() => setShowNewDeck(true)}>
                        <Plus className="w-3.5 h-3.5" /> New Deck
                      </Button>
                    </div>

                    {showNewDeck && (
                      <Card className="p-4 border-primary/30 space-y-3">
                        <Input placeholder="Deck name (e.g. Chapter 5 — Photosynthesis)" value={deckName} onChange={e => setDeckName(e.target.value)} />
                        <div className="flex flex-wrap gap-2">
                          {SUBJECTS.map(s => (
                            <button key={s} onClick={() => setDeckSubject(s)} className={`px-2.5 py-1 rounded-full text-xs border transition-all ${deckSubject === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>{s}</button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button className="flex-1 gradient-primary text-white border-0" size="sm" disabled={!deckName || createDeck.isPending} onClick={() => createDeck.mutate()}>Create Deck</Button>
                          <Button variant="outline" size="sm" onClick={() => setShowNewDeck(false)}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      </Card>
                    )}

                    {decks.length === 0 && !showNewDeck ? (
                      <div className="text-center py-12">
                        <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No decks yet</p>
                        <button className="mt-2 text-sm text-primary hover:underline" onClick={() => setShowNewDeck(true)}>Create your first deck</button>
                      </div>
                    ) : (
                      decks.map(deck => (
                        <Card key={deck.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedDeck(deck)}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{deck.name}</p>
                              {deck.subject && <Badge className={`mt-1 text-xs ${SUBJECT_COLORS[deck.subject] ?? SUBJECT_COLORS.Other}`}>{deck.subject}</Badge>}
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                ) : (
                  /* Deck detail */
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedDeck(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                      <div className="flex-1">
                        <p className="font-semibold">{selectedDeck.name}</p>
                        {selectedDeck.subject && <Badge className={`text-xs ${SUBJECT_COLORS[selectedDeck.subject] ?? SUBJECT_COLORS.Other}`}>{selectedDeck.subject}</Badge>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gradient-primary text-white border-0 gap-1.5" onClick={startReview}>
                          <Brain className="w-3.5 h-3.5" /> Review
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddCard(true)}>
                          <Plus className="w-3.5 h-3.5" /> Add Card
                        </Button>
                      </div>
                    </div>

                    {showAddCard && (
                      <Card className="p-4 border-primary/30 space-y-3">
                        <Textarea placeholder="Front (question)" rows={2} value={cardFront} onChange={e => setCardFront(e.target.value)} />
                        <Textarea placeholder="Back (answer)" rows={2} value={cardBack} onChange={e => setCardBack(e.target.value)} />
                        <div className="flex gap-2">
                          <Button className="flex-1 gradient-primary text-white border-0" size="sm" disabled={!cardFront || !cardBack || addCard.isPending} onClick={() => addCard.mutate()}>Add Card</Button>
                          <Button variant="outline" size="sm" onClick={() => setShowAddCard(false)}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      </Card>
                    )}

                    {deckCards.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No cards yet — add your first card above</p>
                    ) : (
                      <div className="space-y-2">
                        {deckCards.map(card => (
                          <Card key={card.id} className="p-3">
                            <p className="text-sm font-medium">{card.front}</p>
                            <p className="text-xs text-muted-foreground mt-1">{card.back}</p>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            {sessions.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No study sessions yet — start the timer!</p>
              </div>
            ) : (
              sessions.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${SUBJECT_COLORS[s.subject] ?? SUBJECT_COLORS.Other}`}>{s.subject}</Badge>
                          <span className="text-sm font-medium">{s.duration_minutes} min</span>
                        </div>
                        {s.notes && <p className="text-xs text-muted-foreground mt-1 italic">{s.notes}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
