import { NextRequest, NextResponse } from 'next/server'
import { sendDailySummaryEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { to, summary } = await request.json()
    if (!to || !summary) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    const result = await sendDailySummaryEmail(to, summary)
    return NextResponse.json({ success: true, id: result.data?.id })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
