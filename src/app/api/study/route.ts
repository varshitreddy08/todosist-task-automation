import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { study_sessions } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(study_sessions)
    .where(eq(study_sessions.user_id, session.user.id))
    .orderBy(desc(study_sessions.created_at))
    .limit(100)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, duration_minutes, notes } = await req.json()
  const [row] = await db.insert(study_sessions).values({
    user_id: session.user.id,
    subject,
    duration_minutes,
    notes,
  }).returning()

  return NextResponse.json(row)
}
