import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [user] = await db.select({ id: users.id, name: users.name, email: users.email, image: users.image })
      .from(users).where(eq(users.id, session.user.id))
    return NextResponse.json(user ?? session.user)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, image } = await req.json()
    const updates: Record<string, string> = {}
    if (name !== undefined) updates.name = name
    if (image !== undefined) updates.image = image

    const [user] = await db.update(users).set(updates)
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id, name: users.name, email: users.email, image: users.image })
    return NextResponse.json(user)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
