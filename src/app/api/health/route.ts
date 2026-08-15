import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { sql } from 'drizzle-orm'

export async function GET() {
  const results: Record<string, { ok: boolean; message: string }> = {}

  // 1. Database
  try {
    await db.select({ count: sql<number>`count(*)` }).from(users)
    results.database = { ok: true, message: 'Neon DB connected' }
  } catch (e: any) {
    results.database = { ok: false, message: e.message }
  }

  // 2. Resend
  try {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'TaskFlow <onboarding@resend.dev>', to: ['delivered@resend.dev'], subject: 'API Test', html: '<p>Test</p>' }),
    })
    results.resend = res.ok || res.status === 422
      ? { ok: true, message: 'Resend API key valid' }
      : { ok: false, message: `Status ${res.status}` }
  } catch (e: any) {
    results.resend = { ok: false, message: e.message }
  }

  // 3. OpenRouter
  try {
    if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set')
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    })
    results.openrouter = res.ok ? { ok: true, message: 'OpenRouter API key valid' } : { ok: false, message: `Status ${res.status}` }
  } catch (e: any) {
    results.openrouter = { ok: false, message: e.message }
  }

  // 4. FastAPI backend
  try {
    const backendUrl = process.env.AUTOMATION_BACKEND_URL
    if (!backendUrl) throw new Error('AUTOMATION_BACKEND_URL not set')
    const res = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(5000) })
    results.fastapi = res.ok ? { ok: true, message: `Backend alive at ${backendUrl}` } : { ok: false, message: `Status ${res.status}` }
  } catch (e: any) {
    results.fastapi = { ok: false, message: e.message }
  }

  // 5. Env vars check
  const requiredEnvs = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'GOOGLE_CLIENT_ID', 'RESEND_API_KEY', 'OPENROUTER_API_KEY', 'CRON_SECRET', 'AUTOMATION_API_KEY']
  const missingEnvs = requiredEnvs.filter(k => !process.env[k])
  results.env_vars = missingEnvs.length === 0
    ? { ok: true, message: 'All required env vars set' }
    : { ok: false, message: `Missing: ${missingEnvs.join(', ')}` }

  const allOk = Object.values(results).every(r => r.ok)
  return NextResponse.json({ status: allOk ? 'all good' : 'some issues', results }, { status: allOk ? 200 : 207 })
}
