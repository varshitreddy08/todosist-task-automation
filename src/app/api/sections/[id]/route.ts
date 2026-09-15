import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { sections, tasks } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  try {
    const body = await req.json()
    const patch: Record<string, unknown> = {}
    if ('name' in body) patch.name = body.name
    if ('position' in body) patch.position = body.position
    if ('is_collapsed' in body) patch.is_collapsed = body.is_collapsed
    patch.updated_at = new Date()

    const [row] = await db.update(sections)
      .set(patch as any)
      .where(and(eq(sections.id, id), eq(sections.created_by, session.user.id)))
      .returning()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(row)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  try {
    // Unlink tasks in this section (keep them, remove the section reference)
    await db.update(tasks)
      .set({ section_id: null })
      .where(and(eq(tasks.section_id, id), eq(tasks.created_by, session.user.id)))

    const [row] = await db.delete(sections)
      .where(and(eq(sections.id, id), eq(sections.created_by, session.user.id)))
      .returning()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 })
  }
}
