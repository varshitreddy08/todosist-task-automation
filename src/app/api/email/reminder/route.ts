import { NextRequest, NextResponse } from 'next/server'
import { sendTaskReminderEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { to, task } = await request.json()
    if (!to || !task) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    const result = await sendTaskReminderEmail(to, task)
    return NextResponse.json({ success: true, id: result.data?.id })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
