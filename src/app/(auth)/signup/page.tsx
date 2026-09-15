'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { gsap } from 'gsap'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const signupSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="card"]', { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', delay: 0.05 })
      gsap.from('[data-anim="hero"] h1, [data-anim="hero"] p, [data-anim="hero"] li', {
        y: 20, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out', delay: 0.2,
      })
      gsap.from('[data-stagger]', {
        y: 12, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', delay: 0.35,
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  async function onSubmit(data: SignupForm) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password, full_name: data.full_name }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error || 'Failed to create account')
        return
      }
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })
      if (result?.error) {
        toast.error('Account created but sign-in failed. Please log in.')
        router.push('/login')
      } else {
        toast.success('Welcome to TaskFlow!')
        gsap.to('[data-anim="card"]', {
          y: -8, opacity: 0, duration: 0.4, ease: 'power2.in',
          onComplete: () => { router.push('/inbox'); router.refresh() },
        })
      }
    } finally {
      setLoading(false)
    }
  }

  async function signUpWithGoogle() { setGoogleLoading(true); await signIn('google', { callbackUrl: '/inbox' }) }
  async function signUpWithGithub() { setGithubLoading(true); await signIn('github', { callbackUrl: '/inbox' }) }

  return (
    <div ref={rootRef}>
      <div data-stagger className="mb-6">
        <div className="mb-6 flex items-center gap-2.5 lg:hidden">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #ff7a4d, #ff4d6d)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
              <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-semibold">TaskFlow</span>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight">Create your account</h2>
        <p className="mt-1.5 text-sm text-white/60">Free forever · takes 20 seconds</p>
      </div>

      <div data-stagger className="mb-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={signUpWithGoogle}
          disabled={googleLoading}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-white/90 transition hover:bg-white/[0.08] disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335"/>
            </svg>
          )}
          Google
        </button>
        <button
          type="button"
          onClick={signUpWithGithub}
          disabled={githubLoading}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-white/90 transition hover:bg-white/[0.08] disabled:opacity-60"
        >
          {githubLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.929.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
          )}
          GitHub
        </button>
      </div>

      <div data-stagger className="relative mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-widest text-white/40">or with email</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div data-stagger>
          <label htmlFor="full_name" className="text-xs font-medium text-white/70">Full name</label>
          <input
            id="full_name"
            placeholder="Your name"
            className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-orange-400/60 focus:bg-white/[0.06]"
            {...register('full_name')}
          />
          {errors.full_name && <p className="mt-1 text-xs text-rose-300">{errors.full_name.message}</p>}
        </div>

        <div data-stagger>
          <label htmlFor="email" className="text-xs font-medium text-white/70">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-orange-400/60 focus:bg-white/[0.06]"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p>}
        </div>

        <div data-stagger>
          <label htmlFor="password" className="text-xs font-medium text-white/70">Password</label>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 pr-11 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-orange-400/60 focus:bg-white/[0.06]"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-rose-300">{errors.password.message}</p>}
        </div>

        <div data-stagger>
          <label htmlFor="confirmPassword" className="text-xs font-medium text-white/70">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-orange-400/60 focus:bg-white/[0.06]"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <p className="mt-1 text-xs text-rose-300">{errors.confirmPassword.message}</p>}
        </div>

        <button
          data-stagger
          type="submit"
          disabled={loading}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #ff7a4d, #ff4d6d)' }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </button>
      </form>

      <p data-stagger className="mt-6 text-center text-sm text-white/60">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-orange-300 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
