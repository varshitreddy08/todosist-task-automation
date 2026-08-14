import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { habit_completions } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const date = url.searchParams.get('date')

  try {
    const rows = await db.select().from(habit_completions)
      .where(and(eq(habit_completions.user_id, session.user.id), date ? eq(habit_completions.completed_date, date) : undefined))
    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const [row] = await db.insert(habit_completions)
      .values({ ...body, user_id: session.user.id })
      .returning()
    return NextResponse.json(row)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create completion' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const habitId = url.searchParams.get('habitId')
  const date = url.searchParams.get('date')

  if (!habitId || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  try {
    await db.delete(habit_completions)
      .where(and(
        eq(habit_completions.habit_id, habitId),
        eq(habit_completions.user_id, session.user.id),
        eq(habit_completions.completed_date, date),
      ))
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete completion' }, { status: 500 })
  }
}
