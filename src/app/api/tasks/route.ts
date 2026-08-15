import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { tasks } from '@/db/schema'
import { eq, and, isNull, lte, gte, gt, ne, ilike } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const projectId = url.searchParams.get('projectId')
  const filter = url.searchParams.get('filter')
  const userId = session.user.id

  try {
    let rows

    if (url.searchParams.get('q')) {
      const q = url.searchParams.get('q')!
      const limit = parseInt(url.searchParams.get('limit') ?? '8')
      rows = await db.select().from(tasks)
        .where(and(eq(tasks.created_by, userId), ilike(tasks.title, `%${q}%`)))
        .limit(limit)
    } else if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0]
      rows = await db.select().from(tasks)
        .where(and(eq(tasks.created_by, userId), eq(tasks.due_date, today)))
    } else if (filter === 'upcoming') {
      const today = new Date().toISOString().split('T')[0]
      rows = await db.select().from(tasks)
        .where(and(eq(tasks.created_by, userId), gt(tasks.due_date, today), ne(tasks.status, 'completed')))
    } else if (filter === 'upcoming-limit') {
      const today = new Date().toISOString().split('T')[0]
      const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
      rows = await db.select().from(tasks)
        .where(and(eq(tasks.created_by, userId), gt(tasks.due_date, today), lte(tasks.due_date, twoWeeks), ne(tasks.status, 'completed')))
    } else if (filter === 'streak') {
      rows = await db.select({ completed_at: tasks.completed_at }).from(tasks)
        .where(and(eq(tasks.created_by, userId), eq(tasks.status, 'completed')))
    } else if (filter === 'week') {
      const weekStart = url.searchParams.get('weekStart') ?? ''
      const today = new Date().toISOString().split('T')[0]
      rows = await db.select({ due_date: tasks.due_date, status: tasks.status }).from(tasks)
        .where(and(eq(tasks.created_by, userId), gte(tasks.due_date, weekStart), lte(tasks.due_date, today)))
    } else if (filter === 'calendar') {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const month = url.searchParams.get('month') ?? currentMonth
      const start = `${month}-01`
      const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0).toISOString().split('T')[0]
      rows = await db.select({
        id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority,
        due_date: tasks.due_date, due_time: tasks.due_time,
      }).from(tasks)
        .where(and(eq(tasks.created_by, userId), gte(tasks.due_date, start), lte(tasks.due_date, end)))
    } else if (filter === 'analytics') {
      const since = url.searchParams.get('since') ?? ''
      rows = await db.select({
        id: tasks.id, status: tasks.status, priority: tasks.priority,
        created_at: tasks.created_at, completed_at: tasks.completed_at,
        due_date: tasks.due_date, project_id: tasks.project_id, estimated_minutes: tasks.estimated_minutes,
      }).from(tasks).where(and(eq(tasks.created_by, userId), gte(tasks.created_at, new Date(since))))
    } else if (filter === 'created_by') {
      const today = url.searchParams.get('date') ?? ''
      rows = await db.select({ status: tasks.status, due_date: tasks.due_date }).from(tasks)
        .where(eq(tasks.created_by, userId))
    } else if (projectId) {
      rows = await db.select().from(tasks)
        .where(and(eq(tasks.project_id, projectId), eq(tasks.created_by, userId)))
    } else {
      rows = await db.select().from(tasks)
        .where(and(isNull(tasks.project_id), eq(tasks.created_by, userId)))
    }

    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const [row] = await db.insert(tasks).values({
      ...body,
      created_by: session.user.id,
    }).returning()
    return NextResponse.json(row)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
