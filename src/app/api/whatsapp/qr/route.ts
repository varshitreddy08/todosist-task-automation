import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { user_integrations } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [row] = await db.select().from(user_integrations)
    .where(and(eq(user_integrations.user_id, session.user.id), eq(user_integrations.provider, 'whatsapp')))

  if (!row) return NextResponse.json({ error: 'No WhatsApp credentials saved' }, { status: 404 })

  const config = JSON.parse(row.config)
  const { instance_id, api_token } = config

  const res = await fetch(
    `https://api.green-api.com/waInstance${instance_id}/qr/${api_token}`
  )
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch QR' }, { status: 502 })
  const data = await res.json()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { instance_id, api_token } = await req.json()
  if (!instance_id || !api_token) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  await db.delete(user_integrations)
    .where(and(eq(user_integrations.user_id, session.user.id), eq(user_integrations.provider, 'whatsapp')))

  await db.insert(user_integrations).values({
    user_id: session.user.id,
    provider: 'whatsapp',
    config: JSON.stringify({ instance_id, api_token }),
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(user_integrations)
    .where(and(eq(user_integrations.user_id, session.user.id), eq(user_integrations.provider, 'whatsapp')))

  return NextResponse.json({ success: true })
}
