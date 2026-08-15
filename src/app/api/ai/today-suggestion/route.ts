import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { tasks } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { callOpenRouter } from '@/lib/openrouter'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const todayTasks = await db.select({
    title: tasks.title, status: tasks.status, priority: tasks.priority, due_time: tasks.due_time, estimated_minutes: tasks.estimated_minutes,
  }).from(tasks)
    .where(and(eq(tasks.created_by, session.user.id), eq(tasks.due_date, today)))

  if (!todayTasks.length) {
    return NextResponse.json({ suggestion: "No tasks for today. Add something to get started!" })
  }

  const pending = todayTasks.filter(t => t.status !== 'completed')
  const completed = todayTasks.filter(t => t.status === 'completed')

  const taskList = pending.map(t => `- "${t.title}" (${t.priority?.toUpperCase()}${t.due_time ? `, at ${t.due_time}` : ''})`).join('\n')

  try {
    const suggestion = await callOpenRouter(
      `It's ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} right now. The user has completed ${completed.length}/${todayTasks.length} tasks today.\n\nRemaining tasks:\n${taskList}\n\nGive ONE specific, actionable suggestion on what to work on next and why. Max 2 sentences. No markdown.`,
      'You are a smart productivity assistant. Be concise and motivating.'
    )
    return NextResponse.json({ suggestion })
  } catch {
    const urgent = pending.find(t => t.priority === 'p1') ?? pending[0]
    return NextResponse.json({
      suggestion: urgent
        ? `Focus on "${urgent.title}" next — it's your highest priority pending task.`
        : `You've completed ${completed.length} tasks today. Great progress!`
    })
  }
}
