import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { scheduled_emails } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(scheduled_emails)
    .where(eq(scheduled_emails.user_id, session.user.id))
    .orderBy(desc(scheduled_emails.scheduled_at))
    .limit(50)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (!body.to_email || !body.subject || !body.body || !body.scheduled_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [row] = await db.insert(scheduled_emails).values({
    user_id: session.user.id,
    to_email: body.to_email,
    subject: body.subject,
    body: body.body,
    scheduled_at: new Date(body.scheduled_at),
  }).returning()

  return NextResponse.json(row)
}
