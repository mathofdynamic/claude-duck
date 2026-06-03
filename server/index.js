import express from 'express'
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { askClaude } from './ai.js'
import {
  credentialsExist,
  isAuthenticated,
  createOAuth2Client,
  getAuthUrl,
  saveTokens
} from './google-auth.js'
import {
  createDoc,
  readDoc,
  appendToDoc,
  replaceDocContent
} from './google-docs.js'
import { createPsychEvalForm } from './psych-form.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.get('/auth/status', (req, res) => {
  res.json({
    credentialsExist: credentialsExist(),
    authenticated: isAuthenticated()
  })
})

app.get('/auth/google', (req, res) => {
  try {
    const client = createOAuth2Client()
    res.redirect(getAuthUrl(client))
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message))
  }
})

app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query
  if (error) return res.redirect('/?error=' + encodeURIComponent(error))

  try {
    const client = createOAuth2Client()
    const { tokens } = await client.getToken(code)
    saveTokens(tokens)
    res.redirect('/?auth=success')
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message))
  }
})

// ─── Claude ───────────────────────────────────────────────────────────────────

app.post('/generate', async (req, res) => {
  const { prompt } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })

  try {
    const content = await askClaude(prompt.trim())
    res.json({ content })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Forms ────────────────────────────────────────────────────────────────────

app.post('/forms/psych-eval', async (req, res) => {
  try {
    const result = await createPsychEvalForm()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Docs: Direct write (used by Claude Code agent — no CLI round-trip) ───────

// POST /docs/write
// Body: { title?, content }  → creates a new doc and writes content directly
app.post('/docs/write', async (req, res) => {
  const { title = 'Claude Duck Document', content } = req.body
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' })
  try {
    const doc = await createDoc(title)
    await appendToDoc(doc.documentId, content.trim())
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /docs/write/:docId
// Body: { content, mode?: 'append' | 'replace' }  → writes content directly to existing doc
app.post('/docs/write/:docId', async (req, res) => {
  const { content, mode = 'append' } = req.body
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' })
  try {
    const result = mode === 'replace'
      ? await replaceDocContent(req.params.docId, content.trim())
      : await appendToDoc(req.params.docId, content.trim())
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Docs: Read ───────────────────────────────────────────────────────────────

app.get('/docs/read/:docId', async (req, res) => {
  try {
    const doc = await readDoc(req.params.docId)
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Docs: Create ─────────────────────────────────────────────────────────────

// POST /docs/create
// Body: { title?, prompt? }
// Creates a new doc. If prompt is given, Claude generates content and writes it.
app.post('/docs/create', async (req, res) => {
  const { title = 'Claude Duck Document', prompt } = req.body

  try {
    const doc = await createDoc(title)

    if (prompt?.trim()) {
      const content = await askClaude(prompt.trim())
      await appendToDoc(doc.documentId, content)
    }

    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Docs: Update ─────────────────────────────────────────────────────────────

// POST /docs/update/:docId
// Body: { prompt, mode?: 'append' | 'replace', includeCurrentContent?: boolean }
// Claude reads the doc (if includeCurrentContent), generates, then writes.
app.post('/docs/update/:docId', async (req, res) => {
  const { docId } = req.params
  const { prompt, mode = 'append', includeCurrentContent = false } = req.body

  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })

  try {
    let finalPrompt = prompt.trim()

    if (includeCurrentContent) {
      const current = await readDoc(docId)
      finalPrompt =
        `Here is the current document titled "${current.title}":\n\n${current.text}\n\n---\n\n${finalPrompt}`
    }

    const content = await askClaude(finalPrompt)

    const result = mode === 'replace'
      ? await replaceDocContent(docId, content)
      : await appendToDoc(docId, content)

    res.json({ ...result, content })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Claude Duck running at http://localhost:${PORT}`)
  if (!credentialsExist()) {
    console.log('\n⚠  credentials.json not found.')
    console.log('   Download it from Google Cloud Console and place it in server/')
    console.log('   Then visit http://localhost:3001 for setup instructions.\n')
  } else if (!isAuthenticated()) {
    console.log('\n→  Visit http://localhost:3001/auth/google to connect your Google account.\n')
  }
})
