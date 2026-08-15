import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { scheduled_emails, users } from '@/db/schema'
import { and, eq, lte } from 'drizzle-orm'
import { Resend } from 'resend'

const FROM_EMAIL = 'TaskFlow <noreply@varshitreddy.me>'

function verifyCron(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) return false
  return true
}

export async function GET(req: NextRequest) {
  return POST(req)
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const now = new Date()

  const pending = await db.select({
    id: scheduled_emails.id,
    user_id: scheduled_emails.user_id,
    to_email: scheduled_emails.to_email,
    subject: scheduled_emails.subject,
    body: scheduled_emails.body,
  }).from(scheduled_emails)
    .where(and(eq(scheduled_emails.status, 'pending'), lte(scheduled_emails.scheduled_at, now)))

  let sent = 0
  let failed = 0

  for (const email of pending) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email.to_email,
        subject: email.subject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#6366f1">TaskFlow — Scheduled Email</h2>
          <div style="white-space:pre-wrap;line-height:1.6">${email.body}</div>
          <hr style="margin:24px 0;border-color:#e5e7eb"/>
          <p style="font-size:12px;color:#9ca3af">Sent via <a href="${process.env.NEXT_PUBLIC_APP_URL}">TaskFlow</a></p>
        </div>`,
      })
      await db.update(scheduled_emails)
        .set({ status: 'sent', sent_at: new Date() })
        .where(eq(scheduled_emails.id, email.id))
      sent++
    } catch {
      await db.update(scheduled_emails)
        .set({ status: 'failed' })
        .where(eq(scheduled_emails.id, email.id))
      failed++
    }
  }

  return NextResponse.json({ processed: pending.length, sent, failed })
}
