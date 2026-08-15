import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND = process.env.AUTOMATION_BACKEND_URL ?? ''
const API_KEY = process.env.AUTOMATION_API_KEY ?? ''

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const res = await fetch(`${BACKEND}/api/automations/${id}?user_id=${session.user.id}`, {
    method: 'DELETE',
    headers: { 'x-api-key': API_KEY },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
