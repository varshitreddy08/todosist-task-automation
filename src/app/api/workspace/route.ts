import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { workspaces, workspace_members } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [membership] = await db.select({ workspace_id: workspace_members.workspace_id })
      .from(workspace_members)
      .where(eq(workspace_members.user_id, session.user.id))

    if (membership) return NextResponse.json({ workspace_id: membership.workspace_id })

    // Create a default workspace
    const slug = ((session.user.email ?? 'user').split('@')[0] + '-' + Date.now())
      .toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const [ws] = await db.insert(workspaces).values({
      name: 'My Workspace',
      slug,
      owner_id: session.user.id,
    }).returning()

    await db.insert(workspace_members).values({
      workspace_id: ws.id,
      user_id: session.user.id,
      role: 'owner',
    })

    return NextResponse.json({ workspace_id: ws.id })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch workspace' }, { status: 500 })
  }
}
