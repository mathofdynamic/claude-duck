# Claude Duck — Build Plan

## What We Are Building

A Chrome extension that lets the user type a request, sends it to a local server running on their machine, which talks to Claude (via the Claude Code CLI authenticated with the user's existing claude.ai subscription), and then writes the generated content directly into an open Google Doc — with zero API keys required.

---

## Why This Works (The Key Insight)

Claude Code CLI supports `claude auth login` which authenticates using your existing claude.ai Pro/Max subscription. Other programs can talk to Claude Code locally as a subprocess or via the Claude Agent SDK. This means no separate Anthropic API key is needed — your subscription covers it.

The Chrome extension runs in the browser and can make HTTP requests to `localhost`. So:

```
User types request in extension popup
        ↓
Chrome Extension (browser)
        ↓ HTTP POST to localhost:3001
Local Express Server (Node.js, running on machine)
        ↓ Claude Agent SDK
Claude Code CLI (authenticated via claude auth login)
        ↓
Claude (your subscription)
        ↓ response back up the chain
Extension injects content into Google Docs
        ↓ Google Docs API (via chrome.identity OAuth)
Text appears in the document
```

---

## Prerequisites (what must be installed before running)

1. **Node.js** (v18+) — for the local server
2. **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code`
3. **Claude Code authenticated** — run `claude auth login` once and log in with your claude.ai account
4. **Google Chrome** — for the extension
5. **A Google account** — for Google Docs access

---

## Project File Structure

```
D:\Python_Projects\claude-duck\
│
├── PLAN.md                        ← this file
│
├── server\                        ← Local Node.js server
│   ├── package.json
│   ├── index.js                   ← Express server entry point
│   └── claude.js                  ← Claude Agent SDK wrapper
│
└── extension\                     ← Chrome Extension (Manifest V3)
    ├── manifest.json
    ├── popup\
    │   ├── popup.html
    │   ├── popup.js
    │   └── popup.css
    ├── content\
    │   └── content.js             ← injected into Google Docs tabs
    ├── background\
    │   └── background.js          ← service worker
    └── icons\
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

---

## Component 1 — Local Server (`server/`)

### Purpose
Bridge between the Chrome extension and Claude Code CLI. Runs locally on port `3001`. The extension calls it, it calls Claude, and returns the result.

### `server/package.json`
```json
{
  "name": "claude-duck-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "@anthropic-ai/claude-code": "latest"
  }
}
```

### `server/index.js`
- Express server listening on `http://localhost:3001`
- CORS enabled (so the Chrome extension can call it)
- Single endpoint: `POST /generate`
  - Accepts JSON body: `{ "prompt": "write a report about X", "mode": "document" }`
  - Calls `claude.js` to get response
  - Returns JSON: `{ "content": "generated text here..." }`
- Health check endpoint: `GET /health` — returns `{ "status": "ok" }`
- Error handling: returns `{ "error": "message" }` with appropriate status code

### `server/claude.js`
- Uses the Claude Code SDK to run Claude programmatically
- Spawns `claude` CLI as a child process with `--print` flag (non-interactive mode)
- Sends the user's prompt
- Captures the output and returns it as a string
- Implementation approach:

```javascript
// Uses child_process to run:
// claude --print "your prompt here"
// and captures stdout as the response
import { spawn } from 'child_process'

export async function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print', prompt])
    let output = ''
    proc.stdout.on('data', (data) => output += data.toString())
    proc.stderr.on('data', (data) => console.error(data.toString()))
    proc.on('close', (code) => {
      if (code === 0) resolve(output.trim())
      else reject(new Error(`Claude exited with code ${code}`))
    })
  })
}
```

---

## Component 2 — Chrome Extension (`extension/`)

### Purpose
Provides a popup UI in the browser. User types what they want, extension sends it to the local server, gets back the content, then writes it into the currently open Google Doc.

### `extension/manifest.json`
- Manifest Version: **3** (MV3 — current standard)
- Permissions needed:
  - `"activeTab"` — to interact with the current tab
  - `"scripting"` — to inject content scripts
  - `"identity"` — to get Google OAuth token for Docs API
  - `"storage"` — to save user preferences
- Host permissions:
  - `"http://localhost:3001/*"` — to call the local server
  - `"https://docs.google.com/*"` — to interact with Google Docs
  - `"https://www.googleapis.com/*"` — to call Google Docs API
- Background service worker: `background/background.js`
- Content scripts: inject `content/content.js` into `https://docs.google.com/*`
- Popup: `popup/popup.html`
- OAuth2 config: `"oauth2"` block with Google client ID and scopes:
  - `"https://www.googleapis.com/auth/documents"` — read/write Docs
  - `"https://www.googleapis.com/auth/drive.file"` — create new Docs

### `extension/popup/popup.html`
Simple, clean UI with:
- Title: "Claude Duck"
- A `<textarea>` for the user's request (placeholder: "Ask Claude to write something...")
- A dropdown: "Write to current doc" or "Create new document"
- An input field for document title (shown only when "Create new" is selected)
- A "Generate" button
- A status area showing: idle / loading / success / error states

### `extension/popup/popup.js`
Handles the popup logic:

1. On "Generate" button click:
   - Read the prompt from the textarea
   - Read the mode (current doc / new doc)
   - Show loading spinner
   - Send `POST` request to `http://localhost:3001/generate` with `{ prompt, mode }`
   - On success: call `chrome.tabs.sendMessage()` to send content to the content script
   - On error: show error message (e.g., "Local server not running — start it with: npm start")

2. Server health check on popup open:
   - `GET http://localhost:3001/health`
   - If fails: show warning "Local server is not running"

### `extension/content/content.js`
Injected into all `docs.google.com` tabs. Listens for messages from the popup.

Handles two operations:

**Operation 1: Write to current doc**
- Receives `{ action: "write", content: "..." }` message
- Gets the Google Doc ID from the current URL
  - URL format: `https://docs.google.com/document/d/{DOC_ID}/edit`
- Sends message to background script to call Google Docs API with the Doc ID and content

**Operation 2: Create new doc**
- Receives `{ action: "create", title: "...", content: "..." }` message
- Sends message to background script to create a new Google Doc

### `extension/background/background.js`
Service worker. Handles Google Docs API calls (because it can use `chrome.identity`).

Functions:

1. `getAuthToken()` — calls `chrome.identity.getAuthToken({ interactive: true })` to get OAuth token from the user's logged-in Google account

2. `writeToDoc(docId, content)`:
   - Gets auth token
   - Calls Google Docs API: `POST https://docs.googleapis.com/v1/documents/{docId}:batchUpdate`
   - Uses `insertText` request to append content at the end of the document
   - Body: `{ requests: [{ insertText: { location: { index: 1 }, text: content } }] }`

3. `createDoc(title, content)`:
   - Gets auth token
   - Creates new doc: `POST https://docs.googleapis.com/v1/documents` with `{ title }`
   - Gets the new doc ID from the response
   - Writes content to it using `writeToDoc()`
   - Opens the new doc in a new tab

Listens for messages from content script and popup via `chrome.runtime.onMessage`.

---

## Google OAuth Setup (One-Time Step)

To allow the extension to call the Google Docs API, a Google OAuth client ID is needed:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable the **Google Docs API**
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: **Chrome Extension**
6. Add the extension's ID (available after loading it in Chrome)
7. Copy the Client ID into `manifest.json`

> This is a Google Cloud free tier operation — no billing required for this level of Docs API usage.

---

## Full User Flow (Step by Step)

### First-Time Setup
1. Install Node.js
2. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
3. Authenticate: `claude auth login` (log in with claude.ai account)
4. In `D:\Python_Projects\claude-duck\server\`: run `npm install`
5. Set up Google OAuth (one-time, see above)
6. Load the extension in Chrome:
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" → select `D:\Python_Projects\claude-duck\extension\`

### Every Day Use
1. Start the local server: `cd D:\Python_Projects\claude-duck\server && npm start`
2. Open Google Docs in Chrome
3. Click the Claude Duck extension icon
4. Type your request
5. Choose "Write to current doc" or "Create new document"
6. Click "Generate"
7. Content appears in your Google Doc

---

## Error Handling Plan

| Error | What the user sees | How to fix |
|-------|--------------------|------------|
| Local server not running | Warning in popup UI | Run `npm start` in server folder |
| Claude not authenticated | Server returns 401-like error | Run `claude auth login` |
| Google not authorized | Chrome shows OAuth popup | Click Allow |
| Not on a Google Doc | Write button disabled | Navigate to a Google Doc first |
| Network error | "Could not reach local server" | Check if server is running |

---

## Technology Stack Summary

| Component | Technology | Why |
|-----------|-----------|-----|
| Local server | Node.js + Express | Lightweight, same ecosystem as Claude Code |
| Claude integration | Claude Code CLI (`--print` flag) | Uses existing subscription, no API key |
| Chrome extension | Manifest V3, Vanilla JS | No framework needed for this scope |
| Google Docs writing | Google Docs REST API | Most reliable way to write to Docs |
| Google Auth | `chrome.identity` API | Uses user's existing Google session in Chrome |

---

## Build Order

1. Build and test the server first (`server/`)
   - Get `claude --print "hello"` working
   - Confirm Express server returns Claude's response via curl/Postman

2. Build the extension skeleton
   - manifest.json + popup UI
   - Confirm popup opens correctly in Chrome

3. Connect extension to server
   - Confirm popup can call localhost:3001 and get a response

4. Build Google Docs writing
   - Set up OAuth
   - Confirm `writeToDoc()` can append text to a test document

5. Wire everything together
   - Full end-to-end test

---

## Notes for Next Claude Session

- Working directory: `D:\Python_Projects\claude-duck\`
- Start with the server (`server/` folder) — build and test it independently first
- The Claude integration uses `claude --print` subprocess approach (simple, reliable)
- Do NOT use `@anthropic-ai/claude-agent-sdk` for the server — use direct CLI subprocess instead, it's simpler and guaranteed to use the authenticated session
- The extension uses Manifest V3 (not V2 — V2 is deprecated)
- Google OAuth client ID must be filled into `manifest.json` before the Docs API will work
- The extension ID in Chrome changes every time you reload it as unpacked — get the final ID after first load and update the OAuth credentials
