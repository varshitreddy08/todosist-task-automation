import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, verificationTokens } from '@/db/schema'
import { and, eq, gt } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, token, password } = await req.json()

    if (!email || !token || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const [record] = await db.select().from(verificationTokens).where(
      and(
        eq(verificationTokens.identifier, `reset:${email}`),
        eq(verificationTokens.token, token),
        gt(verificationTokens.expires, new Date()),
      )
    )

    if (!record) {
      return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    await db.update(users).set({ password: hashed }).where(eq(users.email, email))
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `reset:${email}`))

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
