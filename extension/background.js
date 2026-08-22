// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('TaskFlow extension v1.1 installed')
})

// Handle messages from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'POMODORO_WORK_DONE') {
    chrome.notifications.create(`pomodoro-work-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🍅 Pomodoro complete!',
      message: `Work session done — cycle #${msg.cycles} complete. Take a 5-minute break!`,
      priority: 2,
    })
  }
  if (msg.type === 'POMODORO_BREAK_DONE') {
    chrome.notifications.create(`pomodoro-break-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '☕ Break over!',
      message: 'Time to focus again. Click the extension to start your next session.',
      priority: 2,
    })
  }
})
