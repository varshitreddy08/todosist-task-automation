import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { api_tokens, tasks } from '@/db/schema'
import { eq, and, lt, gt, ne, gte, lte } from 'drizzle-orm'

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
  const filter = new URL(req.url).searchParams.get('filter') ?? 'today'
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  let rows
  if (filter === 'overdue') {
    rows = await db.select().from(tasks)
      .where(and(eq(tasks.created_by, userId), lt(tasks.due_date, today), ne(tasks.status, 'completed')))
  } else if (filter === 'upcoming') {
    rows = await db.select().from(tasks)
      .where(and(eq(tasks.created_by, userId), gt(tasks.due_date, today), lte(tasks.due_date, nextWeek), ne(tasks.status, 'completed')))
  } else if (filter === 'all') {
    rows = await db.select().from(tasks)
      .where(and(eq(tasks.created_by, userId), ne(tasks.status, 'completed')))
  } else {
    // today (default)
    rows = await db.select().from(tasks)
      .where(and(eq(tasks.created_by, userId), eq(tasks.due_date, today)))
  }

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
  // Drizzle timestamp columns require Date objects, not ISO strings
  if (typeof updates.completed_at === 'string') {
    updates.completed_at = new Date(updates.completed_at)
  }
  const [row] = await db.update(tasks)
    .set({ ...updates, updated_at: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.created_by, userId)))
    .returning()
  if (!row) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  return NextResponse.json(row)
}
