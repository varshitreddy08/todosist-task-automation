import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { notifications } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const [row] = await db.update(notifications)
    .set({ read: body.read ?? true })
    .where(and(eq(notifications.id, id), eq(notifications.user_id, session.user.id)))
    .returning()

  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.user_id, session.user.id)))

  return NextResponse.json({ success: true })
}
