---
description: Edit an existing Google Doc — append new content or rewrite it entirely. Use when the user shares a doc URL and asks to add, update, rewrite, improve, or extend it.
---

You are editing an existing Google Doc using the Claude Duck server.

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

## Step 2 — Verify Google authentication

!`curl -s http://localhost:3001/auth/status 2>/dev/null`

If `authenticated` is false, stop and tell the user:

> Google Docs is not connected.
> Visit **http://localhost:3001** in your browser and click **Connect Google Account**.

## Step 3 — Extract the Doc ID

From the URL `https://docs.google.com/document/d/DOC_ID/edit`, extract the DOC_ID.

## Step 4 — Read the current document

Always read the document first so you have full context before making changes:

```bash
curl -s http://localhost:3001/docs/read/DOC_ID
```

Use the `title` and `text` to understand what is already in the document.

## Step 5 — Decide the write mode

- **append** — user wants to add something (new section, paragraph, conclusion, etc.)
- **replace** — user wants to rewrite or fully replace the content

Default to **append** unless the user clearly wants to replace everything.

## Step 6 — Generate the new content

Write the content now based on the user's request and what you read from the document.
For **append**: write only what should be added.
For **replace**: write the complete new document content.

## Step 7 — Write to the document

```bash
# To append:
curl -s -X POST http://localhost:3001/docs/write/DOC_ID \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"NEW CONTENT\",\"mode\":\"append\"}"

# To replace:
curl -s -X POST http://localhost:3001/docs/write/DOC_ID \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"FULL NEW CONTENT\",\"mode\":\"replace\"}"
```

## Step 8 — Confirm to the user

Show the document URL and a brief description of what was changed.

> ✓ Document updated: **[TITLE](URL)**
