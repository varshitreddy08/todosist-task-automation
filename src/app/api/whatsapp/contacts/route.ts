import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { user_integrations } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [row] = await db.select().from(user_integrations)
    .where(and(eq(user_integrations.user_id, session.user.id), eq(user_integrations.provider, 'whatsapp')))

  if (!row) return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 })

  const { instance_id, api_token } = JSON.parse(row.config)
  const base = `https://api.green-api.com/waInstance${instance_id}`

  const [contactsRes, chatsRes] = await Promise.all([
    fetch(`${base}/getContacts/${api_token}`),
    fetch(`${base}/getChats/${api_token}`),
  ])

  const contacts = contactsRes.ok ? await contactsRes.json() : []
  const chats = chatsRes.ok ? await chatsRes.json() : []

  const people = (contacts as any[])
    .filter(c => c.type === 'user' && c.name)
    .map(c => ({ id: c.id, name: c.name, phone: c.id.replace('@c.us', '') }))

  const groups = (chats as any[])
    .filter(c => c.id?.endsWith('@g.us'))
    .map(c => ({ id: c.id, name: c.name || c.id, isGroup: true }))

  return NextResponse.json({ contacts: people, groups })
}
