---
description: Create a new Google Doc and fill it with Claude-generated content. Use when the user asks to create a document, write something to Google Docs, or start a new doc about a topic.
---

You are creating a new Google Doc using the Claude Duck server.

## Step 1 — Verify the server is running

!`curl -s http://localhost:3001/health 2>/dev/null || echo "offline"`

If the output is `offline` or not `{"status":"ok"}`, stop and tell the user:

> The Claude Duck server is not running.
> Start it from the `server/` folder:
> ```
> cd server
> npm install   # only needed the first time
> npm start
> ```
> Then try again.

## Step 2 — Verify Google authentication

!`curl -s http://localhost:3001/auth/status 2>/dev/null`

If `authenticated` is false, stop and tell the user:

> Google Docs is not connected.
> Visit **http://localhost:3001** in your browser and click **Connect Google Account**.
> Follow the setup instructions on that page if you haven't done the one-time Google Cloud setup yet.

## Step 3 — Generate the content

Based on the user's request, write the full document content now.
Use clear, well-structured prose appropriate for a Google Doc.
Include headings, sections, and formatting cues where helpful.

## Step 4 — Create the document

Use the Bash tool to POST to the server. Escape any double-quotes inside content with `\"`.

```bash
curl -s -X POST http://localhost:3001/docs/write \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"TITLE HERE\",\"content\":\"CONTENT HERE\"}"
```

## Step 5 — Show the result

Extract `url` from the JSON response and present it clearly:

> ✓ Document created: **[TITLE](URL)**
