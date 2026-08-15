import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { db } from '@/db'
import { accounts } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.update(accounts)
    .set({ access_token: null, refresh_token: null })
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, 'google')))

  return NextResponse.json({ ok: true })
}
