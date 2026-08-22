import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { api_tokens, study_sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'

async function verifyToken(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const [row] = await db.select({ user_id: api_tokens.user_id })
    .from(api_tokens).where(eq(api_tokens.token, token))
  return row?.user_id ?? null
}

export async function POST(req: NextRequest) {
  const userId = await verifyToken(req)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { subject, duration_minutes, notes } = await req.json()
  const [row] = await db.insert(study_sessions).values({
    user_id: userId,
    subject: subject || 'General',
    duration_minutes: Math.max(1, Math.round(duration_minutes)),
    notes: notes || null,
  }).returning()
  return NextResponse.json(row)
}
