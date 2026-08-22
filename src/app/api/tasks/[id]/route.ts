import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { tasks, projects, activity_log } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json()

    // Fetch current task for comparison (activity logging)
    const [current] = await db.select().from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.created_by, session.user.id)))
      .limit(1)
    if (!current) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    // Whitelist updatable fields
    const allowed = [
      'title', 'description', 'status', 'priority',
      'due_date', 'due_time', 'is_recurring', 'recurrence_rule',
      'assigned_to', 'position', 'estimated_minutes', 'actual_minutes',
      'completed_at', 'section_id', 'project_id', 'parent_id',
    ] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (typeof updates.completed_at === 'string') {
      updates.completed_at = new Date(updates.completed_at)
    }

    const [row] = await db.update(tasks)
      .set({ ...updates, updated_at: new Date() } as any)
      .where(and(eq(tasks.id, id), eq(tasks.created_by, session.user.id)))
      .returning()
    if (!row) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    // Log activity (fire-and-forget, never fails the request)
    void logActivity(session.user.id, current, body, row)

    return NextResponse.json(row)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

async function logActivity(
  userId: string,
  current: typeof tasks.$inferSelect,
  body: Record<string, unknown>,
  updated: typeof tasks.$inferSelect,
) {
  try {
    // Resolve project name once
    let projectName = 'Inbox'
    if (current.project_id) {
      const [proj] = await db.select({ name: projects.name }).from(projects)
        .where(eq(projects.id, current.project_id)).limit(1)
      if (proj) projectName = proj.name
    }

    const baseEntry = {
      user_id: userId,
      task_id: current.id,
      project_id: current.project_id ?? undefined,
      task_title: updated.title ?? current.title,
      project_name: projectName,
    }

    const entries: (typeof activity_log.$inferInsert)[] = []

    // Status change
    if ('status' in body) {
      const newStatus = body.status as string
      if (newStatus === 'completed' && current.status !== 'completed') {
        entries.push({ ...baseEntry, action: 'completed' })
      } else if (newStatus !== 'completed' && current.status === 'completed') {
        entries.push({ ...baseEntry, action: 'uncompleted' })
      }
    }

    // Priority change
    if ('priority' in body && body.priority !== current.priority) {
      entries.push({
        ...baseEntry,
        action: 'changed_priority',
        old_value: current.priority ?? undefined,
        new_value: body.priority as string,
      })
    }

    // Due date change
    if ('due_date' in body) {
      const newDate = body.due_date as string | null
      if (!current.due_date && newDate) {
        entries.push({ ...baseEntry, action: 'set_date', new_value: newDate })
      } else if (current.due_date && newDate && current.due_date !== newDate) {
        entries.push({ ...baseEntry, action: 'changed_date', old_value: current.due_date, new_value: newDate })
      }
    }

    if (entries.length > 0) {
      await db.insert(activity_log).values(entries)
    }
  } catch (e) {
    console.error('activity log error:', e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = session.user.id
  try {
    // Fetch task for logging before deleting
    const [current] = await db.select().from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.created_by, userId)))
      .limit(1)

    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.created_by, userId)))

    // Log deletion
    if (current) {
      void (async () => {
        try {
          let projectName = 'Inbox'
          if (current.project_id) {
            const [proj] = await db.select({ name: projects.name }).from(projects)
              .where(eq(projects.id, current.project_id)).limit(1)
            if (proj) projectName = proj.name
          }
          await db.insert(activity_log).values({
            user_id: userId,
            task_id: current.id,
            project_id: current.project_id ?? undefined,
            action: 'deleted',
            task_title: current.title,
            project_name: projectName,
          })
        } catch (e) { console.error('activity log error:', e) }
      })()
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
