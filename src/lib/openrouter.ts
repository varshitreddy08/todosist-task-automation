const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function callOpenRouter(prompt: string, systemPrompt?: string): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://uid.varshitreddy.me',
      'X-Title': 'TaskFlow',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: 200,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter error: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

export async function generateTaskReminder(tasks: { title: string; due_date: string; priority: string }[], userName: string): Promise<{ title: string; body: string }> {
  const taskList = tasks.map(t => `- "${t.title}" (${t.priority.toUpperCase()}, due ${t.due_date})`).join('\n')

  const message = await callOpenRouter(
    `The user ${userName} has these overdue or urgent tasks:\n${taskList}\n\nWrite a short, motivating reminder (max 2 sentences). Be specific about the most critical task. Do not use markdown.`,
    'You are a productivity assistant. Write concise, actionable reminders that motivate users to complete their tasks.'
  )

  const urgentTask = tasks.find(t => t.priority === 'p1') ?? tasks[0]
  return {
    title: `AI Reminder: "${urgentTask.title}" needs attention`,
    body: message,
  }
}

export async function generateDailyInsight(stats: { completed: number; pending: number; overdue: number; streak: number }, userName: string): Promise<string> {
  return callOpenRouter(
    `${userName} completed ${stats.completed} tasks today, has ${stats.pending} pending, ${stats.overdue} overdue, and a ${stats.streak}-day streak. Write one motivating insight sentence (no markdown).`,
    'You are a productivity coach. Be encouraging and specific.'
  )
}
