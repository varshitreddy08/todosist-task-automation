import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { notifications } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(notifications)
    .where(eq(notifications.user_id, session.user.id))
    .orderBy(desc(notifications.created_at))
    .limit(50)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const [row] = await db.insert(notifications).values({
    user_id: session.user.id,
    type: body.type ?? 'system',
    title: body.title,
    body: body.body,
  }).returning()

  return NextResponse.json(row)
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.user_id, session.user.id))

  return NextResponse.json({ success: true })
}
