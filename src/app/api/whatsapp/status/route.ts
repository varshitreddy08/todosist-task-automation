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

  if (!row) return NextResponse.json({ connected: false })

  const { instance_id, api_token } = JSON.parse(row.config)

  try {
    const res = await fetch(
      `https://api.green-api.com/waInstance${instance_id}/getStateInstance/${api_token}`
    )
    if (!res.ok) return NextResponse.json({ connected: false })
    const data = await res.json()
    const connected = data.stateInstance === 'authorized'
    return NextResponse.json({ connected, state: data.stateInstance })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
