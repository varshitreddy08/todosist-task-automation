const BASE = 'https://uid.varshitreddy.me'
// Change to http://localhost:3000 for local development

let apiToken = null
let timerInterval = null
let timerSeconds = 0
let timerRunning = false

// ── Storage helpers ──
async function getStorage(key) {
  return new Promise(r => chrome.storage.local.get(key, d => r(d[key])))
}
async function setStorage(key, val) {
  return new Promise(r => chrome.storage.local.set({ [key]: val }, r))
}

// ── API helper ──
async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Screens ──
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'))
  document.getElementById(id)?.classList.remove('hidden')
}

// ── Tabs ──
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name))
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'))
  document.getElementById(`tab-${name}`)?.classList.remove('hidden')
  if (name === 'tasks') loadTasks()
}

// ── Login ──
async function init() {
  apiToken = await getStorage('apiToken')
  if (!apiToken) { showScreen('screen-login'); return }
  try {
    const user = await api('/api/extension/me')
    document.getElementById('user-name').textContent = user.name || user.email?.split('@')[0] || 'User'
    document.getElementById('user-avatar').textContent = (user.name || user.email || 'U')[0].toUpperCase()
    showScreen('screen-main')
    loadTasks()
  } catch {
    await setStorage('apiToken', null)
    apiToken = null
    showScreen('screen-login')
  }
}

document.getElementById('btn-connect').addEventListener('click', async () => {
  const token = document.getElementById('token-input').value.trim()
  if (!token) return
  apiToken = token
  try {
    const user = await api('/api/extension/me')
    await setStorage('apiToken', token)
    document.getElementById('user-name').textContent = user.name || user.email?.split('@')[0] || 'User'
    document.getElementById('user-avatar').textContent = (user.name || user.email || 'U')[0].toUpperCase()
    showScreen('screen-main')
    loadTasks()
  } catch {
    apiToken = null
    alert('Invalid token. Check your Settings → Integrations page.')
  }
})

document.getElementById('btn-logout').addEventListener('click', async () => {
  await setStorage('apiToken', null)
  apiToken = null
  showScreen('screen-login')
})

// ── Tabs ──
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => showTab(tab.dataset.tab))
})

// ── Tasks ──
async function loadTasks() {
  const list = document.getElementById('tasks-list')
  list.innerHTML = '<div class="loading">Loading...</div>'
  try {
    const tasks = await api('/api/extension/tasks')
    const count = document.getElementById('tasks-count')
    const pending = tasks.filter(t => t.status !== 'completed')
    count.textContent = pending.length || ''
    count.style.display = pending.length ? 'inline' : 'none'

    if (!tasks.length) {
      list.innerHTML = '<div class="empty">No tasks for today 🎉<br>Add one below!</div>'
      return
    }

    list.innerHTML = ''
    tasks.sort((a, b) => (a.priority || 'p4').localeCompare(b.priority || 'p4'))
      .forEach(task => {
        const el = document.createElement('div')
        el.className = 'task-item'
        el.innerHTML = `
          <div class="task-check ${task.status === 'completed' ? 'done' : ''}" data-id="${task.id}" data-status="${task.status}"></div>
          <div class="task-body">
            <div class="task-title ${task.status === 'completed' ? 'done' : ''}">${task.title}</div>
            ${task.due_time ? `<div class="task-meta">⏰ ${task.due_time}</div>` : ''}
          </div>
          <div class="priority-badge ${task.priority || 'p4'}">${(task.priority || 'p4').toUpperCase()}</div>
        `
        el.querySelector('.task-check').addEventListener('click', (e) => {
          e.stopPropagation()
          toggleTask(task)
        })
        list.appendChild(el)
      })
  } catch (e) {
    list.innerHTML = `<div class="empty">Failed to load tasks</div>`
  }
}

async function toggleTask(task) {
  const newStatus = task.status === 'completed' ? 'todo' : 'completed'
  await api('/api/extension/tasks', {
    method: 'PATCH',
    body: JSON.stringify({ id: task.id, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }),
  })
  loadTasks()
}

// ── Add task ──
const today = new Date().toISOString().split('T')[0]
document.getElementById('new-task-date').value = today

document.getElementById('btn-add-task').addEventListener('click', async () => {
  const title = document.getElementById('new-task-title').value.trim()
  const due_date = document.getElementById('new-task-date').value
  const priority = document.getElementById('new-task-priority').value
  if (!title) return

  try {
    await api('/api/extension/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, due_date: due_date || today, priority }),
    })
    document.getElementById('new-task-title').value = ''
    const msg = document.getElementById('add-success')
    msg.classList.remove('hidden')
    setTimeout(() => msg.classList.add('hidden'), 2000)
  } catch { alert('Failed to add task') }
})

// ── Timer ──
function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function updateTimerUI() {
  document.getElementById('timer-display').textContent = formatTime(timerSeconds)
  const saveSection = document.getElementById('timer-save-section')
  saveSection.classList.toggle('hidden', timerSeconds < 30 || timerRunning)
}

document.getElementById('btn-timer-toggle').addEventListener('click', () => {
  timerRunning = !timerRunning
  document.getElementById('btn-timer-toggle').textContent = timerRunning ? 'Pause' : (timerSeconds > 0 ? 'Resume' : 'Start')

  if (timerRunning) {
    const subject = document.getElementById('timer-subject').value
    if (subject) {
      const badge = document.getElementById('timer-subject-badge')
      badge.textContent = subject
      badge.classList.remove('hidden')
    }
    const start = Date.now() - timerSeconds * 1000
    timerInterval = setInterval(() => {
      timerSeconds = Math.floor((Date.now() - start) / 1000)
      updateTimerUI()
    }, 1000)
  } else {
    clearInterval(timerInterval)
    updateTimerUI()
  }
})

document.getElementById('btn-timer-reset').addEventListener('click', () => {
  clearInterval(timerInterval)
  timerRunning = false; timerSeconds = 0
  document.getElementById('btn-timer-toggle').textContent = 'Start'
  document.getElementById('timer-subject-badge').classList.add('hidden')
  updateTimerUI()
})

document.getElementById('btn-save-session').addEventListener('click', async () => {
  const subject = document.getElementById('timer-subject').value || 'General'
  const notes = document.getElementById('timer-notes').value
  const duration = Math.max(1, Math.round(timerSeconds / 60))
  try {
    await api('/api/study', {
      method: 'POST',
      body: JSON.stringify({ subject, duration_minutes: duration, notes: notes || null }),
    })
    clearInterval(timerInterval)
    timerRunning = false; timerSeconds = 0
    document.getElementById('btn-timer-toggle').textContent = 'Start'
    document.getElementById('timer-notes').value = ''
    document.getElementById('timer-subject').value = ''
    document.getElementById('timer-subject-badge').classList.add('hidden')
    updateTimerUI()
    alert(`✓ Saved ${duration} min of ${subject}!`)
  } catch { alert('Failed to save session') }
})

// ── Init ──
init()
