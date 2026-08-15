import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND = process.env.AUTOMATION_BACKEND_URL ?? ''
const API_KEY = process.env.AUTOMATION_API_KEY ?? ''

function backendHeaders() {
  return { 'Content-Type': 'application/json', 'x-api-key': API_KEY }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${BACKEND}/api/automations?user_id=${session.user.id}`, {
    headers: backendHeaders(),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const endpoint = body.type === 'whatsapp' ? '/api/schedule/whatsapp' : '/api/schedule/email-ai'

  const res = await fetch(`${BACKEND}${endpoint}`, {
    method: 'POST',
    headers: backendHeaders(),
    body: JSON.stringify({ ...body, user_id: session.user.id }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
