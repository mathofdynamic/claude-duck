---
description: Read the content of a Google Doc. Use when the user shares a Google Docs URL or doc ID and wants to know what is in it, summarise it, or use it as context for further work.
---

You are reading a Google Doc using the Claude Duck server.

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

## Step 2 — Extract the Doc ID

Google Docs URLs look like:
```
https://docs.google.com/document/d/DOC_ID/edit
```
The Doc ID is the segment between `/d/` and `/edit`.
If the user provided just an ID (not a full URL), use it directly.

## Step 3 — Fetch the document

```bash
curl -s http://localhost:3001/docs/read/DOC_ID
```

The response contains:
- `title` — the document title
- `text` — full plain-text content of the document
- `url` — link back to the document

## Step 4 — Respond to the user

Use the `text` to answer the user's question — summarise, quote, analyse, or use it
as context for a follow-up action such as editing.
Always mention the document `title` so the user knows which doc was read.
