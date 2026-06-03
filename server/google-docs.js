import { google } from 'googleapis'
import { getAuthenticatedClient } from './google-auth.js'

function getDocs() {
  return google.docs({ version: 'v1', auth: getAuthenticatedClient() })
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createDoc(title = 'Claude Duck Document') {
  const docs = getDocs()
  const res = await docs.documents.create({ requestBody: { title } })
  return formatDocResult(res.data.documentId, res.data.title)
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function readDoc(docId) {
  const docs = getDocs()
  const res = await docs.documents.get({ documentId: docId })
  const text = extractText(res.data)
  return {
    ...formatDocResult(res.data.documentId, res.data.title),
    text
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function appendToDoc(docId, content) {
  const docs = getDocs()

  const doc = await docs.documents.get({ documentId: docId })
  const endIndex = getEndIndex(doc.data)

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{
        insertText: {
          location: { index: endIndex },
          text: '\n' + content
        }
      }]
    }
  })

  return formatDocResult(docId, doc.data.title)
}

export async function replaceDocContent(docId, content) {
  const docs = getDocs()

  const doc = await docs.documents.get({ documentId: docId })
  const endIndex = getEndIndex(doc.data)
  const requests = []

  if (endIndex > 1) {
    requests.push({
      deleteContentRange: { range: { startIndex: 1, endIndex } }
    })
  }

  requests.push({
    insertText: { location: { index: 1 }, text: content }
  })

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests }
  })

  return formatDocResult(docId, doc.data.title)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEndIndex(docData) {
  const body = docData.body?.content || []
  return body[body.length - 1]?.endIndex - 1 ?? 1
}

function formatDocResult(documentId, title) {
  return {
    documentId,
    title,
    url: `https://docs.google.com/document/d/${documentId}/edit`
  }
}

function extractText(docData) {
  let text = ''
  const content = docData.body?.content || []

  for (const element of content) {
    if (element.paragraph) {
      for (const elem of element.paragraph.elements || []) {
        if (elem.textRun?.content) text += elem.textRun.content
      }
    } else if (element.table) {
      for (const row of element.table.tableRows || []) {
        for (const cell of row.tableCells || []) {
          for (const cellEl of cell.content || []) {
            if (cellEl.paragraph) {
              for (const elem of cellEl.paragraph.elements || []) {
                if (elem.textRun?.content) text += elem.textRun.content
              }
            }
          }
        }
      }
    }
  }

  return text.trim()
}
