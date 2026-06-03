# Claude Duck — Claude's Skill File

This file teaches Claude how to use the Claude Duck system in any session.
Claude Code reads this file automatically when working in this directory.

---

## What This System Is

Claude Duck is a local Node.js server that connects Claude to Google Docs.
Claude (this session) can create, read, and edit real Google Documents by making
HTTP requests to the server running at `http://localhost:3001`.

**No clipboard. No extension. No copy-paste. Claude writes directly to Google Docs.**

---

## Before Doing Anything — Check the Server

```bash
curl -s http://localhost:3001/health
```

- Returns `{"status":"ok"}` → server is running, proceed.
- Fails / connection refused → start the server:

```bash
cd D:/Python_Projects/claude-duck/server && npm start
```

Run it in the background if you need to keep the session interactive.

---

## Check Google Auth

```bash
curl -s http://localhost:3001/auth/status
```

Returns `{"credentialsExist":true,"authenticated":true}` → good to go.

If `authenticated` is false, the user needs to visit `http://localhost:3001/auth/google`.

---

## What Claude Can Do

### 1. Create a new Google Doc (Claude writes the content)

```bash
curl -s -X POST http://localhost:3001/docs/write \
  -H "Content-Type: application/json" \
  -d '{"title":"Doc Title","content":"Your content here"}'
```

Returns `{ documentId, title, url }`.
Open the URL to see the document.

**Workflow:** Claude generates the content in-session → calls this endpoint → document appears in Google Docs.

---

### 2. Append content to an existing doc

```bash
curl -s -X POST http://localhost:3001/docs/write/DOC_ID \
  -H "Content-Type: application/json" \
  -d '{"content":"New content to append","mode":"append"}'
```

---

### 3. Replace all content in an existing doc

```bash
curl -s -X POST http://localhost:3001/docs/write/DOC_ID \
  -H "Content-Type: application/json" \
  -d '{"content":"Replacement content","mode":"replace"}'
```

---

### 4. Read a document

```bash
curl -s http://localhost:3001/docs/read/DOC_ID
```

Returns `{ documentId, title, text, url }`.
`text` is the full plain-text content of the document.

**Workflow:** Read the doc → incorporate `text` into Claude's context → generate a response or edits → write back.

---

### 5. Create a new doc (empty, then write separately)

```bash
curl -s -X POST http://localhost:3001/docs/create \
  -H "Content-Type: application/json" \
  -d '{"title":"My Document"}'
```

---

### 6. Ask the server's Claude CLI to generate + write (bypasses this session)

```bash
# Create + generate content via the server's own Claude subprocess
curl -s -X POST http://localhost:3001/docs/create \
  -H "Content-Type: application/json" \
  -d '{"title":"My Document","prompt":"Write a report about X"}'

# Append + generate via server Claude subprocess
curl -s -X POST http://localhost:3001/docs/update/DOC_ID \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Add a conclusion","mode":"append","includeCurrentContent":true}'
```

Note: Prefer the `/docs/write` endpoints — they skip the Claude subprocess round-trip
since Claude is already generating content in this session.

---

### 7. Pre-built forms

```bash
# Create a fully-formatted Psychological Wellness Evaluation form
curl -s -X POST http://localhost:3001/forms/psych-eval
```

Returns `{ documentId, title, url }` for the formatted document.

---

## Extracting a Doc ID from a URL

Google Docs URLs look like:
```
https://docs.google.com/document/d/1echi-FBiXwFXI9_mqywrFoOHXmGnQCZ_eBhCo0m2n3w/edit
```

The Doc ID is the part between `/d/` and `/edit`:
```
1echi-FBiXwFXI9_mqywrFoOHXmGnQCZ_eBhCo0m2n3w
```

---

## How Claude Should Handle User Requests

| User says | Claude does |
|---|---|
| "Create a document about X" | Generate content → POST /docs/write with title + content |
| "Write X into this doc: [URL]" | Extract doc ID → POST /docs/write/:docId with content |
| "Read this doc and summarize: [URL]" | GET /docs/read/:docId → read `text` → summarize in chat |
| "Edit this doc to add X: [URL]" | GET /docs/read/:docId → generate additions → POST /docs/write/:docId mode:append |
| "Rewrite this doc as X: [URL]" | Generate new content → POST /docs/write/:docId mode:replace |
| "Create a [form/template]" | Generate appropriate content → POST /docs/write |

---

## File Structure

```
D:\Python_Projects\claude-duck\
├── CLAUDE.md                  ← this file (Claude's skill reference)
├── README.md                  ← user-facing documentation
├── PLAN.md                    ← original build plan
├── server\
│   ├── index.js               ← Express server (port 3001)
│   ├── ai.js                  ← Claude CLI subprocess wrapper
│   ├── google-auth.js         ← OAuth2 token management
│   ├── google-docs.js         ← Docs API: create/read/append/replace
│   ├── psych-form.js          ← Pre-built psychological evaluation form
│   ├── credentials.json       ← Google OAuth credentials (not in git)
│   ├── tokens.json            ← Saved auth tokens (not in git)
│   ├── package.json
│   └── public\
│       └── index.html         ← Web UI at localhost:3001
└── extension\                 ← Chrome extension (superseded by server approach)
```

---

## API Reference

| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET | `/health` | — | Server alive check |
| GET | `/auth/status` | — | Check Google auth state |
| GET | `/auth/google` | — | Start OAuth flow |
| GET | `/auth/callback` | — | OAuth callback (automatic) |
| POST | `/generate` | `{prompt}` | Claude generates text, returns it |
| GET | `/docs/read/:docId` | — | Read doc, returns plain text |
| POST | `/docs/write` | `{title?,content}` | Create new doc with content |
| POST | `/docs/write/:docId` | `{content,mode?}` | Write to existing doc |
| POST | `/docs/create` | `{title?,prompt?}` | Create doc (server-Claude generates) |
| POST | `/docs/update/:docId` | `{prompt,mode?,includeCurrentContent?}` | Update doc (server-Claude generates) |
| POST | `/forms/psych-eval` | — | Create psychological evaluation form |
