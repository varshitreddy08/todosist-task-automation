import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: 'google/gemini-flash-1.5',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${file.type};base64,${base64}` },
          },
          {
            type: 'text',
            text: `Parse this class timetable image carefully. Extract every session — classes, exams, labs, tutorials.

IMPORTANT: Many timetables have multiple branches (like CSE, CYS, AIDS, ECE, MECH etc.). If you see branch names, include them.

Return ONLY a valid JSON array, nothing else:
[{"day":"Monday","subject":"Mathematics","start_time":"09:00","end_time":"10:30","type":"class","branch":"CYS"}]

Rules:
- day: full day name (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- start_time and end_time: 24-hour HH:MM format
- type: exactly "class", "exam", or "lab"
- subject: the subject or course name
- branch: the branch/section/department name if visible (e.g. CYS, AIDS, CSE, ECE). Use "ALL" if it applies to everyone or if no branch is specified.
- Extract EVERY slot for ALL branches visible in the timetable
Only return the JSON array.`,
          },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: `AI error: ${err}` }, { status: 500 })
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content || '[]'

  const jsonMatch = content.match(/\[[\s\S]*\]/)
  try {
    const entries = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    return NextResponse.json({ entries })
  } catch {
    return NextResponse.json({ entries: [] })
  }
}
