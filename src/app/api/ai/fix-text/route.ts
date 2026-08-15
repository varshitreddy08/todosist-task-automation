import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { callOpenRouter } from '@/lib/openrouter'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, type = 'message' } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  const systemPrompt = type === 'message'
    ? 'You are a professional writing assistant. Fix grammar, spelling, and punctuation in the given message. Make it clear, natural, and well-written while preserving the original meaning and tone. Return ONLY the corrected text with no explanation.'
    : 'You are a professional writing assistant. Rewrite the given text to be clear, professional, and well-structured. Fix any grammar or spelling issues. Return ONLY the improved text with no explanation.'

  const fixed = await callOpenRouter(text, systemPrompt)
  return NextResponse.json({ fixed: fixed.trim() })
}
