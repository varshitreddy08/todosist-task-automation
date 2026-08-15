import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { scheduled_emails } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(scheduled_emails)
    .where(and(eq(scheduled_emails.id, id), eq(scheduled_emails.user_id, session.user.id)))

  return NextResponse.json({ success: true })
}
