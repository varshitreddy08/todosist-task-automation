'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, RotateCcw, Coffee, Brain, CheckCircle2 } from 'lucide-react'

const MODES = [
  { key: 'focus', label: 'Focus', minutes: 25, icon: Brain, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'short', label: 'Short Break', minutes: 5, icon: Coffee, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { key: 'long', label: 'Long Break', minutes: 15, icon: Coffee, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
] as const

type Mode = typeof MODES[number]['key']

const TIPS = [
  'Eliminate distractions before starting your session.',
  'Break complex tasks into smaller steps.',
  'Stay hydrated — drink water during breaks.',
  'One task at a time leads to deeper focus.',
  'After 4 pomodoros, take a longer break.',
]

export default function FocusPage() {
  const [mode, setMode] = useState<Mode>('focus')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentMode = MODES.find(m => m.key === mode)!

  function switchMode(key: Mode) {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setMode(key)
    const m = MODES.find(m => m.key === key)!
    setSecondsLeft(m.minutes * 60)
  }

  function reset() {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSecondsLeft(currentMode.minutes * 60)
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            if (mode === 'focus') setSessions(n => n + 1)
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, mode])

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const seconds = (secondsLeft % 60).toString().padStart(2, '0')
  const total = currentMode.minutes * 60
  const progress = ((total - secondsLeft) / total) * 100
  const circumference = 2 * Math.PI * 120

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold">Focus Mode</h1>
        <p className="text-muted-foreground text-sm mt-1">Pomodoro timer to keep you in the zone</p>
      </motion.div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-8">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => switchMode(m.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              mode === m.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <svg width="280" height="280" className="-rotate-90">
            <circle cx="140" cy="140" r="120" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
            <motion.circle
              cx="140" cy="140" r="120"
              fill="none" strokeWidth="8"
              strokeLinecap="round"
              className={currentMode.color}
              stroke="currentColor"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${minutes}:${seconds}`}
                initial={{ scale: 0.95, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl font-bold font-mono tabular-nums"
              >
                {minutes}:{seconds}
              </motion.div>
            </AnimatePresence>
            <span className={`text-sm font-medium mt-1 ${currentMode.color}`}>{currentMode.label}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          size="lg"
          className="h-12 px-8 gradient-primary text-white border-0 gap-2"
          onClick={() => setRunning(r => !r)}
        >
          {running ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> {secondsLeft === total ? 'Start' : 'Resume'}</>}
        </Button>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${currentMode.bg}`}>
          <currentMode.icon className={`w-5 h-5 ${currentMode.color}`} />
        </div>
      </div>

      {/* Session counter */}
      <div className="flex justify-center gap-2 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${i < (sessions % 4) ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{sessions}</p>
          <p className="text-xs text-muted-foreground mt-1">Sessions today</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{sessions * 25}m</p>
          <p className="text-xs text-muted-foreground mt-1">Minutes focused</p>
        </Card>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{tip}</p>
        </div>
      </Card>
    </div>
  )
}
