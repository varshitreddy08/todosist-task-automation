import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, users } from '@/db/schema'
import { and, eq, gte, ne } from 'drizzle-orm'
import { sendDailySummaryEmail } from '@/lib/email'
import { generateDailyInsight } from '@/lib/openrouter'
import { format, addDays } from 'date-fns'

function verifyCron(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) return false
  return true
}

export async function GET(req: NextRequest) {
  return POST(req)
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd')

  // Get all users
  const allUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users)

  let sent = 0

  for (const user of allUsers) {
    if (!user.email) continue
    try {
      const allTasks = await db.select({
        status: tasks.status,
        due_date: tasks.due_date,
        completed_at: tasks.completed_at,
      }).from(tasks).where(eq(tasks.created_by, user.id))

      const completed = allTasks.filter(t => t.status === 'completed' && t.completed_at && (t.completed_at as unknown as string).startsWith(today)).length
      const pending = allTasks.filter(t => t.status !== 'completed' && t.due_date === today).length
      const overdue = allTasks.filter(t => t.status !== 'completed' && t.due_date && t.due_date < today).length

      if (completed === 0 && pending === 0 && overdue === 0) continue

      // Streak calculation
      const doneDates = new Set(allTasks.filter(t => t.completed_at).map(t => (t.completed_at as unknown as string).split('T')[0]))
      let streak = 0
      let check = new Date()
      if (!doneDates.has(today)) check = addDays(check, -1)
      while (doneDates.has(format(check, 'yyyy-MM-dd'))) { streak++; check = addDays(check, -1) }

      await sendDailySummaryEmail(user.email, {
        completed,
        pending,
        overdue,
        name: user.name ?? 'there',
      })
      sent++
    } catch (e) {
      console.error(`Daily summary failed for ${user.email}:`, e)
    }
  }

  return NextResponse.json({ sent })
}
