import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await db.select().from(projects)
      .where(eq(projects.created_by, session.user.id))
    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Strip client-provided workspace_id — it can be stale (FK violation)
    const { workspace_id: _ws, ...body } = await req.json()
    const [row] = await db.insert(projects).values({
      name: body.name,
      description: body.description || null,
      color: body.color || '#6366f1',
      icon: body.icon || null,
      is_favorite: body.is_favorite ?? false,
      created_by: session.user.id,
      progress: 0,
    }).returning()
    return NextResponse.json(row)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
