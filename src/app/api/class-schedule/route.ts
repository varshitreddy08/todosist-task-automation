import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { class_schedule } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [row] = await db.select().from(class_schedule).where(eq(class_schedule.user_id, session.user.id))
  return NextResponse.json(row ? JSON.parse(row.entries) : [])
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entries } = await req.json()
  const [existing] = await db.select().from(class_schedule).where(eq(class_schedule.user_id, session.user.id))

  if (existing) {
    await db.update(class_schedule)
      .set({ entries: JSON.stringify(entries), updated_at: new Date() })
      .where(eq(class_schedule.user_id, session.user.id))
  } else {
    await db.insert(class_schedule).values({ user_id: session.user.id, entries: JSON.stringify(entries) })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(class_schedule).where(eq(class_schedule.user_id, session.user.id))
  return NextResponse.json({ ok: true })
}
