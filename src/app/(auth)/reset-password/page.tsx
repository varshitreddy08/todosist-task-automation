'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Lock, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react'

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthLabel = ['', 'Weak', 'Good', 'Strong']
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-emerald-400']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!token || !email) { setError('Invalid reset link'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="text-center">
        <p className="text-destructive mb-4">Invalid or missing reset link.</p>
        <Link href="/forgot-password" className="text-primary hover:underline">Request a new one</Link>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {done ? (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Password updated!</h2>
          <p className="text-muted-foreground text-sm">Redirecting you to sign in...</p>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">New password</h2>
            <p className="text-muted-foreground text-sm">Choose a strong password for <span className="font-medium text-foreground">{email}</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">New password</label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="h-11 pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${strength >= i ? strengthColor[strength] : 'bg-muted'}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${strength === 1 ? 'text-red-500' : strength === 2 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Confirm password</label>
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className={`h-11 ${confirm && confirm !== password ? 'border-destructive' : ''}`}
              />
              {confirm && confirm !== password && (
                <p className="text-xs text-destructive mt-1">Passwords don't match</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full h-11 gradient-primary text-white border-0" disabled={loading || !password || !confirm}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              Set new password
            </Button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function ResetPasswordPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to sign in
      </Link>
      <Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded-xl" />}>
        <ResetForm />
      </Suspense>
    </motion.div>
  )
}
