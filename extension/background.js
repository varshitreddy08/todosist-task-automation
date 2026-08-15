// Background service worker — handles alarms and notifications
chrome.runtime.onInstalled.addListener(() => {
  console.log('TaskFlow extension installed')
})

// Pomodoro alarm notifications
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pomodoro') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'TaskFlow — Time\'s up!',
      message: 'Your study session is complete. Take a break!',
      priority: 2,
    })
  }
})
