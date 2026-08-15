import { NextRequest, NextResponse } from 'next/server'
import { sendDailySummaryEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { to, summary } = await request.json()
    if (!to || !summary) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    const result = await sendDailySummaryEmail(to, summary)
    if (result.error) {
      console.error('Resend error:', result.error)
      return NextResponse.json({ error: (result.error as any).message || 'Resend rejected the email' }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: result.data?.id })
  } catch (error: any) {
    console.error('Email error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to send email' }, { status: 500 })
  }
}
