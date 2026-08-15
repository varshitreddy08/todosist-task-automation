import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { api_tokens, users, tasks } from '@/db/schema'
import { eq } from 'drizzle-orm'

async function verifyToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const [row] = await db.select({ user_id: api_tokens.user_id, id: api_tokens.id })
    .from(api_tokens).where(eq(api_tokens.token, token))
  if (!row) return null
  await db.update(api_tokens).set({ last_used: new Date() }).where(eq(api_tokens.id, row.id))
  return row.user_id
}

export async function GET(req: NextRequest) {
  const userId = await verifyToken(req)
  if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const [user] = await db.select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users).where(eq(users.id, userId))

  return NextResponse.json(user)
}
