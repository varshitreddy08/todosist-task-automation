import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { activity_log } from '@/db/schema'
import { eq, and, desc, gte, lte } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? ''       // '' = all
  const projectId = url.searchParams.get('project') ?? ''   // '' = all
  const dateRange = url.searchParams.get('date') ?? ''      // '' | 'today' | 'week' | 'month'
  const limit = parseInt(url.searchParams.get('limit') ?? '200')

  try {
    const conditions = [eq(activity_log.user_id, session.user.id)]

    if (action) conditions.push(eq(activity_log.action, action as any))
    if (projectId) conditions.push(eq(activity_log.project_id, projectId as any))

    if (dateRange === 'today') {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      conditions.push(gte(activity_log.created_at, today))
    } else if (dateRange === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0)
      conditions.push(gte(activity_log.created_at, d))
    } else if (dateRange === 'month') {
      const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0)
      conditions.push(gte(activity_log.created_at, d))
    }

    const rows = await db.select().from(activity_log)
      .where(and(...conditions))
      .orderBy(desc(activity_log.created_at))
      .limit(limit)

    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
