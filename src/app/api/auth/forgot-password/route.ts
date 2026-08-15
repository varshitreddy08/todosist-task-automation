import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, verificationTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import crypto from 'crypto'

const FROM_EMAIL = 'TaskFlow <noreply@varshitreddy.me>'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email))

    // Always return success to prevent user enumeration
    if (!user) return NextResponse.json({ success: true })

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

    // Remove any existing reset token for this email
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `reset:${email}`))

    await db.insert(verificationTokens).values({
      identifier: `reset:${email}`,
      token,
      expires,
    })

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your TaskFlow password',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <div style="text-align:center;margin-bottom:32px">
            <div style="width:48px;height:48px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
              <span style="color:white;font-size:24px">✓</span>
            </div>
            <h1 style="margin:0;font-size:24px;color:#111">Reset your password</h1>
          </div>
          <p style="color:#555;line-height:1.6">Hi ${user.name ?? 'there'},</p>
          <p style="color:#555;line-height:1.6">We received a request to reset your TaskFlow password. Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${resetUrl}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
              Reset Password
            </a>
          </div>
          <p style="color:#999;font-size:13px;line-height:1.6">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
          <p style="color:#999;font-size:12px;border-top:1px solid #eee;margin-top:24px;padding-top:16px">Or paste this URL: <a href="${resetUrl}" style="color:#6366f1">${resetUrl}</a></p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }
}
