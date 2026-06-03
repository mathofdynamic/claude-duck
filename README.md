# Claude Duck

**Claude + Google Docs. Ask Claude to create, read, and edit your documents — directly.**

No clipboard tricks. No copy-paste. Claude writes straight into Google Docs via the API.

---

## How It Works

```
You describe what you want
        ↓
Local Node.js server (localhost:3001)
        ↓
Claude generates the content
        ↓
Google Docs API writes it into your document
        ↓
Document ready — open the link
```

---

## Prerequisites

| Requirement | Install |
|---|---|
| Node.js v18+ | [nodejs.org](https://nodejs.org) |
| Claude Code CLI | `npm install -g @anthropic-ai/claude-code` |
| Authenticated Claude | `claude auth login` |
| Google Cloud credentials | See setup below |

---

## First-Time Setup

### 1. Install dependencies

```bash
cd D:\Python_Projects\claude-duck\server
npm install
```

### 2. Set up Google OAuth (one time)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select a project
3. Enable **Google Docs API** and **Google Drive API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add `http://localhost:3001/auth/callback` as an Authorized redirect URI
7. Download the JSON → save it as `server/credentials.json`
8. Go to **OAuth consent screen** → **Test users** → add your Gmail address

### 3. Connect your Google account

```bash
# Start the server
cd server && npm start

# Open in browser — click "Connect Google Account"
http://localhost:3001
```

---

## Daily Use

### Start the server

```bash
cd D:\Python_Projects\claude-duck\server
npm start
```

Then open `http://localhost:3001` in your browser.

### Web UI

Three tabs:

| Tab | What it does |
|---|---|
| **Create Doc** | Give a title + prompt → Claude writes a new Google Doc |
| **Edit Doc** | Paste a doc URL + prompt → Claude appends or replaces content |
| **Read Doc** | Paste a doc URL → see the full document text |

---

## Using Claude Directly

If you're in a Claude Code session in this directory, Claude reads `CLAUDE.md`
and knows how to manage your documents. Just tell it what you want:

> *"Create a project proposal for a mobile app that tracks habits"*

> *"Read this doc and add a conclusion: https://docs.google.com/document/d/..."*

> *"Rewrite the introduction of this doc to be more formal: [URL]"*

> *"Create a psychological evaluation form"*

Claude generates the content and writes it directly to Google Docs — no copy-paste needed.

---

## Available Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Check if server is running |
| `GET /auth/status` | Check Google auth state |
| `GET /docs/read/:docId` | Read a document's text content |
| `POST /docs/write` | Create a new doc with content |
| `POST /docs/write/:docId` | Append or replace content in a doc |
| `POST /docs/create` | Create doc (Claude CLI generates content) |
| `POST /docs/update/:docId` | Update doc (Claude CLI generates content) |
| `POST /forms/psych-eval` | Create a formatted psychological evaluation form |

---

## Project Structure

```
claude-duck/
├── CLAUDE.md          — Claude's skill reference (read automatically by Claude Code)
├── README.md          — This file
├── server/
│   ├── index.js       — Express server
│   ├── ai.js          — Claude CLI subprocess
│   ├── google-auth.js — OAuth token management
│   ├── google-docs.js — Google Docs API operations
│   ├── psych-form.js  — Pre-built evaluation form with rich formatting
│   └── public/
│       └── index.html — Web UI
└── extension/         — Chrome extension (experimental, superseded by server)
```
