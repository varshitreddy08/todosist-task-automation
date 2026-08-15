import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { api_tokens } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import crypto from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select({
    id: api_tokens.id,
    name: api_tokens.name,
    last_used: api_tokens.last_used,
    created_at: api_tokens.created_at,
    // never expose full token
    token_preview: api_tokens.token,
  }).from(api_tokens)
    .where(eq(api_tokens.user_id, session.user.id))
    .orderBy(desc(api_tokens.created_at))

  return NextResponse.json(rows.map(r => ({
    ...r,
    token_preview: r.token_preview.slice(0, 8) + '...',
  })))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const token = `tf_${crypto.randomBytes(32).toString('hex')}`
  const [row] = await db.insert(api_tokens).values({
    user_id: session.user.id,
    name,
    token,
  }).returning()

  return NextResponse.json({ ...row, token }) // return full token only on creation
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await db.delete(api_tokens).where(eq(api_tokens.id, id))
  return NextResponse.json({ success: true })
}
