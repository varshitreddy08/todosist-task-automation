import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { api_tokens, tasks } from '@/db/schema'
import { eq, and, ne } from 'drizzle-orm'

async function verifyToken(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const [row] = await db.select({ user_id: api_tokens.user_id })
    .from(api_tokens).where(eq(api_tokens.token, token))
  return row?.user_id ?? null
}

export async function GET(req: NextRequest) {
  const userId = await verifyToken(req)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const rows = await db.select().from(tasks)
    .where(and(eq(tasks.created_by, userId), eq(tasks.due_date, today)))
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const userId = await verifyToken(req)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await req.json()
  const [row] = await db.insert(tasks).values({
    ...body,
    created_by: userId,
  }).returning()
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest) {
  const userId = await verifyToken(req)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { id, ...updates } = await req.json()
  const [row] = await db.update(tasks)
    .set({ ...updates, updated_at: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.created_by, userId)))
    .returning()
  return NextResponse.json(row)
}
