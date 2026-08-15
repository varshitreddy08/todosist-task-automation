import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND = process.env.AUTOMATION_BACKEND_URL ?? ''
const API_KEY = process.env.AUTOMATION_API_KEY ?? ''

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${BACKEND}/api/preview-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ ...body, user_id: session.user.id, scheduled_at: new Date().toISOString() }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
