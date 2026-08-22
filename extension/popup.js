const BASE = 'https://uid.varshitreddy.me'
// const BASE = 'http://localhost:3000'   // ← uncomment for local dev

// ── State ──
let apiToken = null
let timerInterval = null
let timerSeconds = 0
let timerRunning = false
let pomodoroMode = false
let pomodoroPhase = 'work'  // 'work' | 'break'
let pomodoroCycles = 0
let pomodoroTarget = 25 * 60
let notesDebounce = null
let currentFilter = 'today'
const POMODORO_WORK = 25 * 60
const POMODORO_BREAK = 5 * 60

// ── Storage helpers ──
const getStorage = key => new Promise(r => chrome.storage.local.get(key, d => r(d[key])))
const setStorage = (key, val) => new Promise(r => chrome.storage.local.set({ [key]: val }, r))

// ── API helper ──
async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Screen / Tab helpers ──
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'))
  document.getElementById(id)?.classList.remove('hidden')
}
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name))
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'))
  document.getElementById(`tab-${name}`)?.classList.remove('hidden')
  if (name === 'tasks') loadTasks()
  if (name === 'notes') loadNotes()
}

// ── Dark mode ──
async function applyTheme(dark) {
  document.body.setAttribute('data-theme', dark ? 'dark' : 'light')
  document.getElementById('btn-theme').textContent = dark ? '☀️' : '🌙'
}

document.getElementById('btn-theme').addEventListener('click', async () => {
  const dark = document.body.getAttribute('data-theme') !== 'dark'
  await setStorage('theme', dark ? 'dark' : 'light')
  applyTheme(dark)
})

// ── Init ──
async function init() {
  // Restore theme
  const savedTheme = await getStorage('theme')
  applyTheme(savedTheme === 'dark')

  // Restore last filter
  const savedFilter = await getStorage('taskFilter')
  if (savedFilter) {
    currentFilter = savedFilter
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === savedFilter)
    })
  }

  // Auth
  apiToken = await getStorage('apiToken')
  if (!apiToken) { showScreen('screen-login'); return }

  try {
    const user = await api('/api/extension/me')
    setUserInfo(user)
    showScreen('screen-main')
    loadTasks()
  } catch {
    await setStorage('apiToken', null)
    apiToken = null
    showScreen('screen-login')
  }
}

function setUserInfo(user) {
  const name = user.name || user.email?.split('@')[0] || 'User'
  document.getElementById('user-name').textContent = name
  document.getElementById('user-email').textContent = user.email || ''
  document.getElementById('user-avatar').textContent = name[0].toUpperCase()
}

// ── Login ──
document.getElementById('btn-connect').addEventListener('click', async () => {
  const token = document.getElementById('token-input').value.trim()
  const errEl = document.getElementById('login-error')
  errEl.classList.add('hidden')
  if (!token) return
  apiToken = token
  try {
    const user = await api('/api/extension/me')
    await setStorage('apiToken', token)
    setUserInfo(user)
    showScreen('screen-main')
    loadTasks()
  } catch {
    apiToken = null
    errEl.textContent = 'Invalid token. Check Settings → Integrations.'
    errEl.classList.remove('hidden')
  }
})

document.getElementById('token-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-connect').click()
})

document.getElementById('btn-logout').addEventListener('click', async () => {
  await setStorage('apiToken', null)
  apiToken = null
  showScreen('screen-login')
})

// ── Tab navigation ──
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => showTab(tab.dataset.tab))
})

// ── Filter buttons ──
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    currentFilter = btn.dataset.filter
    setStorage('taskFilter', currentFilter)
    loadTasks()
  })
})

document.getElementById('btn-refresh').addEventListener('click', () => loadTasks())

// ── Tasks ──
async function loadTasks() {
  const list = document.getElementById('tasks-list')
  list.innerHTML = '<div class="loading">Loading...</div>'
  document.getElementById('tasks-count-bar').classList.add('hidden')

  try {
    const tasks = await api(`/api/extension/tasks?filter=${currentFilter}`)
    renderTasks(tasks)
  } catch {
    list.innerHTML = '<div class="empty"><span class="emoji">⚠️</span>Failed to load tasks.<br>Check your connection.</div>'
  }
}

function formatDueDate(dateStr) {
  if (!dateStr) return null
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (dateStr < today) {
    const days = Math.round((new Date(today) - new Date(dateStr)) / 86400000)
    return { text: days === 1 ? 'Overdue by 1 day' : `Overdue by ${days} days`, cls: 'overdue' }
  }
  if (dateStr === today) return { text: 'Due today', cls: '' }
  if (dateStr === tomorrow) return { text: 'Due tomorrow', cls: 'due-soon' }
  return { text: `Due ${dateStr}`, cls: '' }
}

function renderTasks(tasks) {
  const list = document.getElementById('tasks-list')
  const countBar = document.getElementById('tasks-count-bar')
  const countLabel = document.getElementById('tasks-count-label')

  const pending = tasks.filter(t => t.status !== 'completed')
  const done = tasks.filter(t => t.status === 'completed')

  const filterLabels = { today: 'today', upcoming: 'upcoming', overdue: 'overdue', all: 'total' }
  countLabel.textContent = `${pending.length} pending · ${done.length} done`
  countBar.classList.toggle('hidden', tasks.length === 0)

  if (tasks.length === 0) {
    const emojis = { today: '🎉', upcoming: '📅', overdue: '✅', all: '📋' }
    const msgs = {
      today: 'No tasks for today!<br>Enjoy your day or add one.',
      upcoming: 'No upcoming tasks in the next 7 days.',
      overdue: 'No overdue tasks. You\'re on top of it!',
      all: 'No pending tasks. Great work!',
    }
    list.innerHTML = `<div class="empty"><span class="emoji">${emojis[currentFilter]}</span>${msgs[currentFilter] || 'No tasks found.'}</div>`
    return
  }

  list.innerHTML = ''

  // Sort: pending first, then by priority, then by due date
  const sorted = [...tasks].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    return (a.priority || 'p4').localeCompare(b.priority || 'p4') ||
           (a.due_date || '').localeCompare(b.due_date || '')
  })

  sorted.forEach(task => {
    const done = task.status === 'completed'
    const due = task.due_date ? formatDueDate(task.due_date) : null
    const isOverdue = due?.cls === 'overdue'

    const el = document.createElement('div')
    el.className = `task-item${isOverdue && !done ? ' overdue-item' : ''}`

    const metaParts = []
    if (task.due_time) metaParts.push(`⏰ ${task.due_time}`)
    if (due) metaParts.push(`<span class="${due.cls}">${due.text}</span>`)

    el.innerHTML = `
      <div class="task-check ${done ? 'done' : ''}" data-id="${task.id}" data-status="${task.status}"></div>
      <div class="task-body">
        <div class="task-title ${done ? 'done' : ''}">${escHtml(task.title)}</div>
        ${metaParts.length ? `<div class="task-meta">${metaParts.join(' · ')}</div>` : ''}
      </div>
      <div class="priority-badge ${task.priority || 'p4'}">${(task.priority || 'P4').toUpperCase()}</div>
    `
    el.querySelector('.task-check').addEventListener('click', e => {
      e.stopPropagation()
      toggleTask(task)
    })
    list.appendChild(el)
  })
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

async function toggleTask(task) {
  const newStatus = task.status === 'completed' ? 'todo' : 'completed'
  try {
    await api('/api/extension/tasks', {
      method: 'PATCH',
      body: JSON.stringify({
        id: task.id,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      }),
    })
    loadTasks()
  } catch {
    // silently retry
    loadTasks()
  }
}

// ── Add task ──
document.getElementById('new-task-date').value = new Date().toISOString().split('T')[0]

document.getElementById('btn-add-task').addEventListener('click', addTask)
document.getElementById('new-task-title').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask()
})

async function addTask() {
  const title = document.getElementById('new-task-title').value.trim()
  const desc = document.getElementById('new-task-desc').value.trim()
  const due_date = document.getElementById('new-task-date').value
  const priority = document.getElementById('new-task-priority').value
  const errEl = document.getElementById('add-error')
  const successEl = document.getElementById('add-success')

  errEl.classList.add('hidden')
  successEl.classList.add('hidden')
  if (!title) return

  try {
    await api('/api/extension/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: desc || null,
        due_date: due_date || new Date().toISOString().split('T')[0],
        priority,
        status: 'todo',
        is_recurring: false,
      }),
    })
    document.getElementById('new-task-title').value = ''
    document.getElementById('new-task-desc').value = ''
    successEl.classList.remove('hidden')
    setTimeout(() => successEl.classList.add('hidden'), 3000)
  } catch (e) {
    errEl.textContent = 'Failed to add task. Try again.'
    errEl.classList.remove('hidden')
  }
}

// ── Timer ──
function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display')
  if (pomodoroMode) {
    const remaining = Math.max(0, pomodoroTarget - timerSeconds)
    display.textContent = formatTime(remaining)
    // Check if phase ended
    if (remaining === 0 && timerRunning) finishPomodoroPhase()
  } else {
    display.textContent = formatTime(timerSeconds)
  }
  const saveSection = document.getElementById('timer-save-section')
  saveSection.classList.toggle('hidden', pomodoroMode || timerSeconds < 30 || timerRunning)
}

function updatePomodoroUI() {
  const phaseEl = document.getElementById('pomodoro-phase')
  const phaseLabel = document.getElementById('phase-label')
  const cyclesRow = document.getElementById('pomodoro-cycles-row')
  const cyclesCount = document.getElementById('pomodoro-cycles')
  const isWork = pomodoroPhase === 'work'
  phaseEl.className = `phase-badge${isWork ? '' : ' break'}`
  phaseLabel.textContent = isWork
    ? `🧠 Work · ${formatTime(POMODORO_WORK - timerSeconds)}`
    : `☕ Break · ${formatTime(POMODORO_BREAK - timerSeconds)}`
  cyclesCount.textContent = `${pomodoroCycles} cycle${pomodoroCycles !== 1 ? 's' : ''} done`
  cyclesRow.classList.toggle('hidden', pomodoroCycles === 0)
}

function finishPomodoroPhase() {
  clearInterval(timerInterval)
  timerRunning = false
  timerSeconds = 0
  document.getElementById('btn-timer-toggle').textContent = 'Start'

  if (pomodoroPhase === 'work') {
    pomodoroCycles++
    pomodoroPhase = 'break'
    pomodoroTarget = POMODORO_BREAK
    chrome.runtime.sendMessage({ type: 'POMODORO_WORK_DONE', cycles: pomodoroCycles })
  } else {
    pomodoroPhase = 'work'
    pomodoroTarget = POMODORO_WORK
    chrome.runtime.sendMessage({ type: 'POMODORO_BREAK_DONE' })
  }
  updateTimerDisplay()
  updatePomodoroUI()
}

// Mode toggle
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (timerRunning) return  // don't switch while running
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    pomodoroMode = btn.dataset.mode === 'pomodoro'

    // Reset timer state
    clearInterval(timerInterval)
    timerRunning = false; timerSeconds = 0
    pomodoroPhase = 'work'; pomodoroTarget = POMODORO_WORK; pomodoroCycles = 0
    document.getElementById('btn-timer-toggle').textContent = 'Start'
    document.getElementById('timer-subject-badge').classList.add('hidden')

    // Show/hide pomodoro UI
    document.getElementById('pomodoro-phase').classList.toggle('hidden', !pomodoroMode)
    document.getElementById('pomodoro-cycles-row').classList.toggle('hidden', true)
    document.getElementById('timer-save-section').classList.add('hidden')
    updateTimerDisplay()
    if (pomodoroMode) updatePomodoroUI()
  })
})

document.getElementById('btn-timer-toggle').addEventListener('click', () => {
  timerRunning = !timerRunning
  const btn = document.getElementById('btn-timer-toggle')
  btn.textContent = timerRunning ? 'Pause' : (timerSeconds > 0 ? 'Resume' : 'Start')

  if (timerRunning) {
    const subject = document.getElementById('timer-subject').value
    if (subject) {
      const badge = document.getElementById('timer-subject-badge')
      badge.textContent = subject
      badge.classList.remove('hidden')
    }
    const startEpoch = Date.now() - timerSeconds * 1000
    timerInterval = setInterval(() => {
      timerSeconds = Math.floor((Date.now() - startEpoch) / 1000)
      updateTimerDisplay()
      if (pomodoroMode) updatePomodoroUI()
    }, 500)
  } else {
    clearInterval(timerInterval)
    updateTimerDisplay()
  }
})

document.getElementById('btn-timer-reset').addEventListener('click', () => {
  clearInterval(timerInterval)
  timerRunning = false; timerSeconds = 0
  pomodoroPhase = 'work'; pomodoroTarget = POMODORO_WORK; pomodoroCycles = 0
  document.getElementById('btn-timer-toggle').textContent = 'Start'
  document.getElementById('timer-subject-badge').classList.add('hidden')
  document.getElementById('pomodoro-cycles-row').classList.toggle('hidden', true)
  updateTimerDisplay()
  if (pomodoroMode) updatePomodoroUI()
})

document.getElementById('btn-save-session').addEventListener('click', async () => {
  const subject = document.getElementById('timer-subject').value || 'General'
  const notes = document.getElementById('timer-notes').value
  const duration = Math.max(1, Math.round(timerSeconds / 60))
  const btn = document.getElementById('btn-save-session')
  btn.textContent = 'Saving...'
  btn.disabled = true

  try {
    await api('/api/extension/study', {
      method: 'POST',
      body: JSON.stringify({ subject, duration_minutes: duration, notes: notes || null }),
    })
    clearInterval(timerInterval)
    timerRunning = false; timerSeconds = 0
    document.getElementById('btn-timer-toggle').textContent = 'Start'
    document.getElementById('timer-notes').value = ''
    document.getElementById('timer-subject').value = ''
    document.getElementById('timer-subject-badge').classList.add('hidden')
    updateTimerDisplay()
    btn.textContent = `✓ Saved ${duration} min!`
    setTimeout(() => { btn.textContent = '💾 Save Session'; btn.disabled = false }, 2000)
  } catch {
    btn.textContent = '💾 Save Session'
    btn.disabled = false
    alert('Failed to save session. Check your connection.')
  }
})

// ── Notes ──
async function loadNotes() {
  const saved = await getStorage('quickNotes')
  document.getElementById('notes-area').value = saved || ''
}

document.getElementById('notes-area').addEventListener('input', () => {
  const statusEl = document.getElementById('notes-status')
  statusEl.textContent = 'Saving...'
  clearTimeout(notesDebounce)
  notesDebounce = setTimeout(async () => {
    await setStorage('quickNotes', document.getElementById('notes-area').value)
    statusEl.textContent = 'Saved ✓'
  }, 600)
})

document.getElementById('btn-clear-notes').addEventListener('click', async () => {
  if (!document.getElementById('notes-area').value) return
  if (!confirm('Clear all notes?')) return
  document.getElementById('notes-area').value = ''
  await setStorage('quickNotes', '')
  document.getElementById('notes-status').textContent = 'Cleared'
})

// ── Start ──
init()
