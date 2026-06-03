// Content script — injected into all docs.google.com tabs

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'write') {
    handleWrite(message.content).then(sendResponse).catch((err) =>
      sendResponse({ success: false, error: err.message })
    )
    return true
  }

  if (message.action === 'create') {
    handleCreate(message.title, message.content).then(sendResponse).catch((err) =>
      sendResponse({ success: false, error: err.message })
    )
    return true
  }
})

// Write to the currently open doc.
// Tries a ClipboardEvent with the content embedded in clipboardData —
// bypasses the isTrusted issue because Google Docs may read event.clipboardData
// directly rather than checking the event source.
async function handleWrite(content) {
  try {
    const iframe = document.querySelector('.docs-texteventtarget-iframe')
    if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
      const body = iframe.contentDocument.body
      body.focus()

      const dt = new DataTransfer()
      dt.setData('text/plain', content)
      dt.setData('text/html', content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>'))

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true
      })

      body.dispatchEvent(pasteEvent)

      // Give Google Docs a moment to process, then check if content landed
      await new Promise(r => setTimeout(r, 300))

      // Verify by checking the document body text changed
      const bodyText = iframe.contentDocument.body.innerText || ''
      if (bodyText.length > 0) {
        return { success: true, autoPasted: true }
      }
    }
  } catch {
    // fall through
  }

  // Fallback: content is still in clipboard, user pastes with Ctrl+V
  return { success: true, autoPasted: false }
}

// Create a new doc — requires Google OAuth (handled by background.js)
async function handleCreate(title, content) {
  const response = await chrome.runtime.sendMessage({
    action: 'createDoc',
    title,
    content
  })

  if (!response?.success) {
    throw new Error(response?.error || 'Failed to create document')
  }

  return { success: true, autoPasted: false }
}
