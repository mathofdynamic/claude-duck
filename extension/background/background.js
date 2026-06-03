// Background service worker — handles Google OAuth and Docs API calls

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'writeToDoc') {
    writeToDoc(message.docId, message.content)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message.action === 'createDoc') {
    createDoc(message.title, message.content)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true
  }
})

async function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(token)
      }
    })
  })
}

async function writeToDoc(docId, content) {
  const token = await getAuthToken()

  // Fetch the document to find the end index so we append rather than prepend
  const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (!docRes.ok) {
    const err = await docRes.json()
    throw new Error(err.error?.message || `Failed to fetch document (${docRes.status})`)
  }

  const doc = await docRes.json()

  // body.content is an array of structural elements; the last element's endIndex
  // marks the end of the document. We insert just before that.
  const bodyContent = doc.body?.content || []
  const lastElement = bodyContent[bodyContent.length - 1]
  const insertIndex = lastElement ? lastElement.endIndex - 1 : 1

  // Prepend a newline so content doesn't run into existing text
  const textToInsert = '\n' + content

  const updateRes = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: insertIndex },
              text: textToInsert
            }
          }
        ]
      })
    }
  )

  if (!updateRes.ok) {
    const err = await updateRes.json()
    throw new Error(err.error?.message || `Failed to write to document (${updateRes.status})`)
  }
}

async function createDoc(title, content) {
  const token = await getAuthToken()

  // Create a new document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  })

  if (!createRes.ok) {
    const err = await createRes.json()
    throw new Error(err.error?.message || `Failed to create document (${createRes.status})`)
  }

  const newDoc = await createRes.json()
  const docId = newDoc.documentId

  // Write content into the newly created document
  await writeToDoc(docId, content)

  // Open the new document in a new tab
  const docUrl = `https://docs.google.com/document/d/${docId}/edit`
  chrome.tabs.create({ url: docUrl })
}
