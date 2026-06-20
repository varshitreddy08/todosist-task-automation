import { Resend } from 'resend'

const FROM_EMAIL = 'TaskFlow <noreply@varshitreddy.me>'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendTaskReminderEmail(to: string, task: { title: string; due_date: string; priority: string }) {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Reminder: ${task.title} is due soon`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="color:#6366f1">TaskFlow Reminder</h1>
        <p>Your task <strong>${task.title}</strong> is due on <strong>${task.due_date}</strong>.</p>
        <p>Priority: <span style="color:#ef4444">${task.priority.toUpperCase()}</span></p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View Task</a>
      </div>
    `,
  })
}

export async function sendDailySummaryEmail(to: string, summary: { completed: number; pending: number; overdue: number; name: string }) {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your Daily TaskFlow Summary`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="color:#6366f1">Daily Summary - ${summary.name}</h1>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:24px 0">
          <div style="background:#f0fdf4;padding:16px;border-radius:8px;text-align:center">
            <div style="font-size:32px;font-weight:bold;color:#22c55e">${summary.completed}</div>
            <div>Completed</div>
          </div>
          <div style="background:#fef9c3;padding:16px;border-radius:8px;text-align:center">
            <div style="font-size:32px;font-weight:bold;color:#eab308">${summary.pending}</div>
            <div>Pending</div>
          </div>
          <div style="background:#fef2f2;padding:16px;border-radius:8px;text-align:center">
            <div style="font-size:32px;font-weight:bold;color:#ef4444">${summary.overdue}</div>
            <div>Overdue</div>
          </div>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Open TaskFlow</a>
      </div>
    `,
  })
}

export async function sendWeeklyReportEmail(to: string, report: { name: string; completionRate: number; totalCompleted: number; streak: number; topProject: string }) {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your Weekly TaskFlow Report`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="color:#6366f1">Weekly Report - ${report.name}</h1>
        <p>Great week, ${report.name}! Here's your summary:</p>
        <ul>
          <li>Completion Rate: <strong>${report.completionRate}%</strong></li>
          <li>Tasks Completed: <strong>${report.totalCompleted}</strong></li>
          <li>Current Streak: <strong>${report.streak} days</strong></li>
          <li>Top Project: <strong>${report.topProject}</strong></li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/analytics" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">View Analytics</a>
      </div>
    `,
  })
}
