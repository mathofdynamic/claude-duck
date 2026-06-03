const SERVER_URL = 'http://localhost:3001'

const promptEl = document.getElementById('prompt')
const modeEl = document.getElementById('mode')
const titleGroupEl = document.getElementById('title-group')
const docTitleEl = document.getElementById('doc-title')
const generateBtn = document.getElementById('generate-btn')
const btnText = document.getElementById('btn-text')
const btnSpinner = document.getElementById('btn-spinner')
const statusEl = document.getElementById('status')
const serverWarning = document.getElementById('server-warning')

// Show/hide doc title field based on mode
modeEl.addEventListener('change', () => {
  if (modeEl.value === 'new') {
    titleGroupEl.classList.remove('hidden')
  } else {
    titleGroupEl.classList.add('hidden')
  }
})

function setLoading(loading) {
  generateBtn.disabled = loading
  btnText.textContent = loading ? 'Generating...' : 'Generate'
  btnSpinner.classList.toggle('hidden', !loading)
}

function showStatus(message, type) {
  statusEl.textContent = message
  statusEl.className = `status ${type}`
  statusEl.classList.remove('hidden')
}

function hideStatus() {
  statusEl.classList.add('hidden')
}

// Health check on popup open
async function checkServer() {
  try {
    const res = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) throw new Error('not ok')
    serverWarning.classList.add('hidden')
  } catch {
    serverWarning.classList.remove('hidden')
  }
}

generateBtn.addEventListener('click', async () => {
  const prompt = promptEl.value.trim()
  if (!prompt) {
    showStatus('Please enter a prompt.', 'error')
    return
  }

  const mode = modeEl.value
  const title = docTitleEl.value.trim() || 'Claude Duck Output'

  hideStatus()
  setLoading(true)

  let content
  try {
    const res = await fetch(`${SERVER_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || `Server error ${res.status}`)
    }

    content = data.content
  } catch (err) {
    setLoading(false)
    if (err.message.includes('fetch') || err.name === 'TypeError') {
      showStatus('Could not reach local server. Run: npm start in the server folder.', 'error')
    } else {
      showStatus(`Error: ${err.message}`, 'error')
    }
    return
  }

  // Send content to the active tab's content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })

    if (!tab || !tab.url?.includes('docs.google.com')) {
      showStatus('Please open a Google Doc first, then try again.', 'error')
      setLoading(false)
      return
    }

    // Write to clipboard here — popup is focused so clipboard access works
    if (mode !== 'new') {
      await navigator.clipboard.writeText(content)
    }

    const message = mode === 'new'
      ? { action: 'create', title, content }
      : { action: 'write', content }

    const response = await sendToTab(tab.id, message)

    if (response?.success) {
      if (mode === 'new') {
        showStatus('✓ New document created!', 'success')
      } else if (response.autoPasted) {
        showStatus('✓ Content inserted into document!', 'success')
      } else {
        showStatus('✓ Content copied to clipboard — click in your doc and press Ctrl+V to paste.', 'success')
      }
    } else {
      throw new Error(response?.error || 'Unknown error writing to document')
    }
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error')
  }

  setLoading(false)
})

// Send a message to a tab, injecting the content script first if needed
async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message)
  } catch (err) {
    if (err.message.includes('Receiving end does not exist')) {
      // Tab was open before the extension loaded — inject the content script now
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      })
      // Brief pause for the listener to register
      await new Promise(r => setTimeout(r, 150))
      return await chrome.tabs.sendMessage(tabId, message)
    }
    throw err
  }
}

// Run health check immediately
checkServer()
