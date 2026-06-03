# Claude Duck

<p align="center">
  <img src="claude-duck-image.png" alt="Claude Duck" width="600" />
</p>

> Claude + Google Docs. Ask Claude to create, read, and edit documents — directly, via API.

No clipboard tricks. No manual copy-paste. Claude writes straight into Google Docs through the Google Docs REST API, triggered by natural language from a Claude Code session or a local web UI.

---

## Screenshots

<p align="center">
  <img src="Extention-screenshot.png" alt="Claude Duck Extension Screenshot" width="600" />
  <br /><br />
  <img src="Extention-screenshot-2.png" alt="Claude Duck Extension Screenshot 2" width="600" />
</p>

---

## Overview

Claude Duck is a local Node.js server that bridges Claude Code with Google Docs. It exposes a REST API that Claude Code skills call automatically, so you can say *"create a project proposal for a mobile app"* and get a formatted Google Doc in return — without leaving your terminal.

```
Claude Code session (natural language)
              │
              ▼
  Local server — localhost:3001
       │               │
       ▼               ▼
  Claude CLI      Google Docs API
  (generates)     (writes & reads)
              │
              ▼
    Formatted Google Doc
```

---

## Features

- **Create** — generate a new Google Doc from a title and prompt
- **Read** — fetch the full text of any document you have access to
- **Edit** — append new content or fully replace an existing document
- **Forms** — create richly formatted pre-built documents (e.g. psychological evaluation form with styled headers, rating scales, and scoring guide)
- **Web UI** — browser-based interface at `http://localhost:3001` for direct use
- **Claude Code skills** — `/duck-create`, `/duck-read`, `/duck-edit`, `/duck-form-psych` work automatically from any Claude Code session in this directory

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js v18+ | [nodejs.org](https://nodejs.org) |
| Claude Code CLI | `npm install -g @anthropic-ai/claude-code` |
| Authenticated Claude session | `claude auth login` |
| Google Cloud project with OAuth 2.0 credentials | See setup below |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/claude-duck.git
cd claude-duck/server
npm install
```

### 2. Configure Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable the **Google Docs API** and **Google Drive API**
4. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Set the application type to **Web application**
6. Add `http://localhost:3001/auth/callback` as an Authorized Redirect URI
7. Download the JSON file and save it as `server/credentials.json`
8. Go to **OAuth consent screen → Test users** and add your Gmail address

> `server/credentials.json` is listed in `.gitignore` and will never be committed.
> See `server/credentials.json.example` for the expected file structure.

### 3. Connect your Google account

Start the server, then complete the one-time OAuth flow in your browser:

```bash
cd server
npm start
```

Open `http://localhost:3001` and click **Connect Google Account**. After authorization, a `tokens.json` file is saved locally and all subsequent requests are authenticated automatically.

---

## Daily Use

### Start the server

```bash
cd server
npm start
```

The server runs at `http://localhost:3001`. Keep it running while you work.

### Option A — Claude Code session (recommended)

Open a Claude Code session in the project directory. Claude reads `CLAUDE.md` and `PLAN.md` automatically and knows the full API surface. Describe what you need in plain language:

```
"Create a project proposal for a mobile habit-tracking app"

"Read this doc and summarise the key points: https://docs.google.com/document/d/..."

"Add a conclusion section to this document: [URL]"

"Rewrite the introduction of this doc to be more formal: [URL]"

"Create a psychological wellness evaluation form"
```

Claude generates the content and writes it directly to Google Docs. It returns a link to the document when done.

### Option B — Web UI

Navigate to `http://localhost:3001` in your browser. Three tabs are available:

| Tab | Description |
|---|---|
| **Create Doc** | Provide a title and content prompt; a new Google Doc is created |
| **Edit Doc** | Provide a document URL and instructions; content is appended or replaced |
| **Read Doc** | Provide a document URL; the full document text is returned |

### Option C — Claude Code skills (slash commands)

From any Claude Code session in this directory, the following skills are available:

| Skill | Trigger phrase |
|---|---|
| `/duck-create` | Create a new Google Doc |
| `/duck-read` | Read a Google Doc |
| `/duck-edit` | Edit an existing Google Doc |
| `/duck-form-psych` | Generate a formatted psychological evaluation form |

Skills automatically verify that the server is running and that Google is authenticated before proceeding.

---

## API Reference

All endpoints are served from `http://localhost:3001`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns `{"status":"ok"}` if the server is running |
| `GET` | `/auth/status` | Returns Google authentication state |
| `GET` | `/auth/google` | Initiates the OAuth flow |
| `GET` | `/auth/callback` | OAuth redirect handler |
| `GET` | `/docs/read/:docId` | Returns the title, text, and URL of a document |
| `POST` | `/docs/write` | Creates a new document with the provided content |
| `POST` | `/docs/write/:docId` | Appends or replaces content in an existing document |
| `POST` | `/docs/create` | Creates a document (Claude CLI generates content from a prompt) |
| `POST` | `/docs/update/:docId` | Updates a document (Claude CLI generates content from a prompt) |
| `POST` | `/forms/psych-eval` | Creates a fully formatted psychological evaluation form |

### Request body — `POST /docs/write`

```json
{
  "title": "Document Title",
  "content": "Full document text"
}
```

### Request body — `POST /docs/write/:docId`

```json
{
  "content": "Text to add",
  "mode": "append"
}
```

`mode` accepts `"append"` (default) or `"replace"`.

---

## Project Structure

```
claude-duck/
├── CLAUDE.md                        Claude's project reference (auto-read by Claude Code)
├── README.md                        This file
├── .claude/
│   └── commands/
│       ├── duck-create.md           /duck-create skill
│       ├── duck-read.md             /duck-read skill
│       ├── duck-edit.md             /duck-edit skill
│       └── duck-form-psych.md       /duck-form-psych skill
└── server/
    ├── index.js                     Express server and route definitions
    ├── ai.js                        Claude CLI subprocess wrapper
    ├── google-auth.js               OAuth token management
    ├── google-docs.js               Google Docs API operations
    ├── psych-form.js                Pre-built psychological evaluation form
    ├── credentials.json.example     Credentials template
    └── public/
        └── index.html               Web UI
```

---

## Security

- `server/credentials.json` and `server/tokens.json` are excluded from version control via `.gitignore`. Never commit these files.
- The server binds to `localhost` only and is not intended to be exposed to the internet.
- OAuth tokens are stored locally and refreshed automatically.

---

## License

MIT
