'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="card"]', { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', delay: 0.05 })
      gsap.from('[data-stagger]', { y: 12, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.25 })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={rootRef}>
      <Link
        href="/login"
        data-stagger
        className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>

      {sent ? (
        <div className="text-center">
          <div
            data-stagger
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-orange-500/30"
            style={{ background: 'linear-gradient(135deg, #ff7a4d, #ff4d6d)' }}
          >
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
          <h2 data-stagger className="text-2xl font-semibold tracking-tight">Check your email</h2>
          <p data-stagger className="mt-2 text-sm text-white/60">We sent a reset link to</p>
          <p data-stagger className="mt-1 font-medium">{email}</p>
          <p data-stagger className="mt-4 text-sm text-white/50">
            The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
          </p>
          <button
            data-stagger
            onClick={() => { setSent(false); setEmail('') }}
            className="mt-6 h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] text-sm font-medium text-white/90 transition hover:bg-white/[0.08]"
          >
            Try a different email
          </button>
        </div>
      ) : (
        <>
          <div data-stagger className="mb-6">
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #ff7a4d, #ff4d6d)' }}
            >
              <Mail className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Forgot password?</h2>
            <p className="mt-2 text-sm text-white/60">Enter your email and we&apos;ll send you a reset link.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div data-stagger>
              <label className="text-xs font-medium text-white/70">Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-orange-400/60 focus:bg-white/[0.06]"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
            )}

            <button
              data-stagger
              type="submit"
              disabled={loading || !email}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #ff7a4d, #ff4d6d)' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send reset link
            </button>
          </form>
        </>
      )}

      <p data-stagger className="mt-8 text-center text-sm text-white/60">
        Remembered your password?{' '}
        <Link href="/login" className="font-medium text-orange-300 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
