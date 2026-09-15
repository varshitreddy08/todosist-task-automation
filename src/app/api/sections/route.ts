import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { sections } from '@/db/schema'
import { eq, and, isNull, asc } from 'drizzle-orm'

function isTableMissingError(e: any): boolean {
  const msg = String(e?.message ?? e ?? '').toLowerCase()
  const code = String(e?.code ?? '')
  return (
    code === '42p01' ||
    msg.includes('does not exist') && msg.includes('sections') ||
    msg.includes('relation') && msg.includes('sections') ||
    msg.includes('no such table')
  )
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const projectId = url.searchParams.get('projectId')

  try {
    const where = projectId
      ? and(eq(sections.created_by, session.user.id), eq(sections.project_id, projectId))
      : and(eq(sections.created_by, session.user.id), isNull(sections.project_id))

    const rows = await db.select().from(sections).where(where).orderBy(asc(sections.position))
    return NextResponse.json(rows)
  } catch (e: any) {
    if (isTableMissingError(e)) {
      return NextResponse.json([])
    }
    console.error('[GET /api/sections] error:', e)
    return NextResponse.json({ error: 'Failed to fetch sections', detail: String(e?.message ?? e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch {}

  try {
    const [row] = await db.insert(sections).values({
      name: (body.name ?? '').trim() || 'New section',
      project_id: body.project_id ?? null,
      position: typeof body.position === 'number' ? body.position : 0,
      created_by: session.user.id,
    }).returning()
    return NextResponse.json(row)
  } catch (e: any) {
    console.error('[POST /api/sections] error:', e)
    if (isTableMissingError(e)) {
      return NextResponse.json(
        {
          error: 'MISSING_TABLE',
          message: 'The `sections` database table does not exist yet. Run `npm run db:push` in the project root to create it.',
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'CREATE_FAILED', message: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}
