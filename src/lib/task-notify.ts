import { toast } from 'sonner'

// ── Sound ────────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null
const SOUND_KEY = 'tf.sound.enabled'

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
  const AC = w.AudioContext ?? w.webkitAudioContext
  if (!AC) return null
  audioCtx = new AC()
  return audioCtx
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = localStorage.getItem(SOUND_KEY)
    return v === null ? true : v === '1'
  } catch { return true }
}

export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0') } catch { /* ignore */ }
}

/** Plays a short two-note "ding" via the Web Audio API. No asset required. */
export function playCompletionSound() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const now = ctx.currentTime
    const notes = [
      { freq: 660, at: 0,     dur: 0.09 },
      { freq: 988, at: 0.085, dur: 0.16 },
    ]
    for (const n of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = n.freq
      gain.gain.setValueAtTime(0.0001, now + n.at)
      gain.gain.exponentialRampToValueAtTime(0.16, now + n.at + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + n.at)
      osc.stop(now + n.at + n.dur + 0.02)
    }
  } catch { /* ignore */ }
}

// ── Combined notify ─────────────────────────────────────────────────────────
export interface CompletionOpts {
  /** Task title for the toast body */
  title: string
  /** Handler run when user clicks "Undo" — should un-complete the task */
  onUndo: () => void
  /** Was this the last remaining active task? Emit a celebratory variant. */
  wasLast?: boolean
}

/**
 * Central handler to call from any onToggle handler *only* when a task
 * transitions from incomplete → completed. Plays a sound and shows a Sonner
 * toast with an Undo action.
 */
export function celebrateCompletion({ title, onUndo, wasLast }: CompletionOpts) {
  playCompletionSound()
  const trimmed = title.length > 60 ? title.slice(0, 60) + '…' : title
  toast.success(wasLast ? '🎉 Inbox zero!' : 'Task completed', {
    description: trimmed,
    action: { label: 'Undo', onClick: onUndo },
    duration: 5000,
  })
}
