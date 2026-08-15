import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { whatsapp_busy_mode } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [row] = await db.select().from(whatsapp_busy_mode).where(eq(whatsapp_busy_mode.user_id, session.user.id))
  return NextResponse.json(row ?? null)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const [existing] = await db.select().from(whatsapp_busy_mode).where(eq(whatsapp_busy_mode.user_id, session.user.id))

  const data = {
    active: body.active ?? true,
    message: body.message ?? '',
    ai_mode: body.ai_mode ?? false,
    context: body.context ?? '',
    contacts: body.contacts ?? 'all',
    expires_at: body.expires_at ? new Date(body.expires_at) : null,
    updated_at: new Date(),
  }

  if (existing) {
    await db.update(whatsapp_busy_mode).set(data).where(eq(whatsapp_busy_mode.user_id, session.user.id))
  } else {
    await db.insert(whatsapp_busy_mode).values({ user_id: session.user.id, ...data })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.update(whatsapp_busy_mode)
    .set({ active: false, updated_at: new Date() })
    .where(eq(whatsapp_busy_mode.user_id, session.user.id))

  return NextResponse.json({ ok: true })
}
