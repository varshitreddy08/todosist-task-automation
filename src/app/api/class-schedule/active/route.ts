import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { class_schedule } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json(null)

  const [row] = await db.select().from(class_schedule).where(eq(class_schedule.user_id, session.user.id))
  if (!row) return NextResponse.json(null)

  const entries: Array<{ day: string; subject: string; start_time: string; end_time: string; type: string }> = JSON.parse(row.entries)

  const now = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = days[now.getDay()]
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${hh}:${mm}`

  const active = entries.find(e =>
    e.day === today &&
    e.start_time <= currentTime &&
    e.end_time >= currentTime
  )

  return NextResponse.json(active ?? null)
}
