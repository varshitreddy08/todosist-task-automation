import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { accounts } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

function makeGmailRFC822(to: string, subject: string, body: string, fromEmail: string, fromName: string) {
  const msg = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n')
  return Buffer.from(msg).toString('base64url')
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, subject, body } = await req.json()

  const [account] = await db.select().from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, 'google')))

  if (!account) {
    return NextResponse.json({ error: 'No Google account linked. Sign in with Google first.' }, { status: 400 })
  }

  let accessToken = account.access_token
  if (!accessToken && account.refresh_token) {
    accessToken = await refreshAccessToken(account.refresh_token)
  }
  if (!accessToken) {
    return NextResponse.json({ error: 'Gmail access token expired — please re-connect Google' }, { status: 401 })
  }

  // Get user's Gmail address
  const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!profileRes.ok) return NextResponse.json({ error: 'Failed to get Gmail profile' }, { status: 502 })
  const profile = await profileRes.json()
  const fromEmail = profile.emailAddress
  const fromName = session.user.name ?? fromEmail

  const raw = makeGmailRFC822(to, subject, body, fromEmail, fromName)

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })

  if (!sendRes.ok) {
    const err = await sendRes.json()
    return NextResponse.json({ error: err.error?.message ?? 'Gmail send failed' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
