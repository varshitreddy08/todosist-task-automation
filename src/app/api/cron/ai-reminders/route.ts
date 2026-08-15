import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, notifications, users } from '@/db/schema'
import { and, eq, lt, ne, isNotNull } from 'drizzle-orm'
import { generateTaskReminder } from '@/lib/openrouter'

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

  // Get all overdue incomplete tasks grouped by user
  const overdueTasks = await db.select({
    id: tasks.id,
    title: tasks.title,
    priority: tasks.priority,
    due_date: tasks.due_date,
    created_by: tasks.created_by,
  }).from(tasks)
    .where(and(
      ne(tasks.status, 'completed'),
      isNotNull(tasks.due_date),
      lt(tasks.due_date, today),
    ))

  if (!overdueTasks.length) return NextResponse.json({ message: 'No overdue tasks' })

  // Group by user
  const byUser: Record<string, typeof overdueTasks> = {}
  for (const task of overdueTasks) {
    if (!task.created_by) continue
    byUser[task.created_by] ??= []
    byUser[task.created_by].push(task)
  }

  let created = 0

  for (const [userId, userTasks] of Object.entries(byUser)) {
    try {
      const user = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).then(r => r[0])
      const userName = user?.name ?? 'there'

      const top = userTasks
        .sort((a, b) => (a.priority ?? 'p4').localeCompare(b.priority ?? 'p4'))
        .slice(0, 5)
        .map(t => ({ title: t.title, due_date: t.due_date ?? '', priority: t.priority ?? 'p4' }))

      const { title, body } = await generateTaskReminder(top, userName)

      await db.insert(notifications).values({
        user_id: userId,
        type: 'ai',
        title,
        body,
      })
      created++
    } catch (e) {
      console.error(`AI reminder failed for user ${userId}:`, e)
    }
  }

  return NextResponse.json({ usersProcessed: Object.keys(byUser).length, notificationsCreated: created })
}
