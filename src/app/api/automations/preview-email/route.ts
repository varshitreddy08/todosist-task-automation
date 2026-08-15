import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ai_prompt, recipient_name, to_email, tone = 'professional' } = await req.json()
  if (!ai_prompt) return NextResponse.json({ error: 'ai_prompt is required' }, { status: 400 })

  const recipient = recipient_name || to_email || 'there'
  const senderName = session.user.name || 'Varshit'

  const system = `You are drafting an email on behalf of ${senderName}. Write in a ${tone} tone. Return ONLY valid JSON with exactly two keys: "subject" (string) and "body" (string). No markdown, no explanation outside the JSON.`
  const userMsg = `Write an email to ${recipient} about: ${ai_prompt}`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMsg },
      ],
      max_tokens: 600,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('OpenRouter error:', err)
    return NextResponse.json({ error: 'AI failed to generate email' }, { status: 500 })
  }

  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content?.trim() ?? ''

  const match = content.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'AI returned unexpected format' }, { status: 500 })

  try {
    const parsed = JSON.parse(match[0])
    return NextResponse.json({ subject: parsed.subject ?? '', body: parsed.body ?? '' })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
