---
description: Create a beautifully formatted Psychological Wellness Evaluation form in Google Docs with rich styling applied via the Docs API. Use when the user asks for a psychological form, assessment, self-evaluation, or mental wellness questionnaire.
---

You are creating a pre-built Psychological Wellness Evaluation form using the Claude Duck server.

The form is fully formatted with rich styles applied via the Google Docs API:
navy section headers, teal rating circles, purple scoring guide, divider lines, and clinician notes.
No manual formatting is needed — it is all done automatically.

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

## Step 3 — Create the form

```bash
curl -s -X POST http://localhost:3001/forms/psych-eval
```

The form contains 7 sections:
1. Personal Information
2. Emotional Well-Being — Likert scale 1–5
3. Stress & Anxiety — Likert scale 1–5
4. Social Functioning & Relationships — Likert scale 1–5
5. Self-Perception & Identity — Likert scale 1–5
6. Life Satisfaction Index — scale 1–10 per life area
7. Open Reflection — written questions

Plus a Scoring Guide with interpretation ranges and a Clinician Notes section.

## Step 4 — Show the result

Extract `url` from the response and present it:

> ✓ Your Psychological Wellness Evaluation is ready:
> **[Open Document](URL)**
