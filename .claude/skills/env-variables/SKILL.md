---
name: env-variables
description: Help the user add an environment variable (API key, secret, configuration value) safely for both local development and Vercel production.
---

# Environment variables

The user said _"I have an API key"_, _"I need to add a secret"_, _"how
do I store this token"_. Environment variables are how secrets and
config values are kept out of the source code.

**Division of labor (Rule 0):** you create and edit `.env.local` and
`lib/env.ts` directly with your file tools (no terminal needed). The
user does three things: (1) pastes their secret value into chat once
so you can write it to `.env.local`, (2) pastes any restart-the-dev-
server command if needed, and (3) clicks through the Vercel dashboard
to add the same var for production (you can't reach their Vercel
account).

## The two places they live

Every env var has to be set in **two** places:

| Where         | File / location           | Used when                 |
| ------------- | ------------------------- | ------------------------- |
| Locally       | `.env.local` (gitignored) | running `npm run dev`     |
| In production | Vercel dashboard          | the live deployed website |

Setting it in only one of them is the #1 source of "it works on my
machine but the live site is broken" reports.

## Naming convention

- **Server-only secrets** (API keys, database URLs, anything sensitive):
  bare name. Example: `OPENAI_API_KEY`.
- **Browser-exposed values** (analytics IDs, public URLs, feature
  flags): prefix with `NEXT_PUBLIC_`. Example:
  `NEXT_PUBLIC_APP_URL`. ⚠️ **Anything `NEXT_PUBLIC_*` is visible to
  every visitor's browser** — never put a secret behind this prefix.

## Step 1 — Add to `.env.local` (local development)

If the file doesn't exist, create it at the repo root. It's already
covered by `.gitignore` so it won't be uploaded to GitHub.

```bash
# .env.local
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then **restart the dev server** — Next.js only reads env files on
startup:

```bash
# Stop the running `npm run dev` (Ctrl+C), then:
npm run dev
```

## Step 2 — Add a typed accessor with zod

So the app fails fast if the var is missing. Edit (or create)
`lib/env.ts`:

```ts
import { z } from "zod"

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

export const env = EnvSchema.parse(process.env)
```

Then use `env.OPENAI_API_KEY` everywhere — never `process.env.X`
directly. See `.claude/skills/validation/SKILL.md`.

## Step 3 — Add to Vercel (production)

Read this to the user, literally:

> 1.  Open <https://vercel.com/dashboard> and click your project.
> 2.  Click **Settings** (top right tabs) → **Environment Variables**
>     (left sidebar).
> 3.  In **Key**, type the variable name (e.g. `OPENAI_API_KEY`).
> 4.  In **Value**, paste the secret value.
> 5.  Under **Environments**, leave **Production**, **Preview**, and
>     **Development** all checked (unless you have a reason not to).
> 6.  Click **Save**.
> 7.  Repeat for every variable in your `.env.local`.

**Important:** Vercel **does not redeploy automatically** when env vars
change. After saving, the user needs to trigger a new deployment:

- Either push a new commit (any tiny change), or
- In the dashboard: **Deployments** → click the latest → ⋯ menu →
  **Redeploy**.

Tell the user this explicitly — it's confusing the first time.

## Common patterns

### A public site URL

```env
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel: set to https://your-project.vercel.app
NEXT_PUBLIC_APP_URL=https://my-leaply-app.vercel.app
```

### An LLM API key (OpenAI, Anthropic, etc.)

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

Use these only from **server code** — Route Handlers
(`app/api/*/route.ts`), Server Actions, or Server Components. Never
from a `"use client"` component.

### A database URL

```env
DATABASE_URL=postgres://...
```

## What you must NOT do

- ❌ Commit `.env.local`. It's gitignored — keep it that way.
- ❌ Put secrets behind `NEXT_PUBLIC_*`. They become public.
- ❌ Hard-code keys in source files "temporarily". Once a secret hits
  Git history, it's leaked — even if you delete the line later.
- ❌ Skip the zod schema in `lib/env.ts`. Without it, a missing var
  causes confusing `undefined` errors deep in the app.

## If a key leaks

If the user accidentally commits a secret:

1. **Rotate the key immediately** at the provider (OpenAI dashboard,
   etc.). Removing it from Git history does not un-leak it — anyone
   who saw the commit has it.
2. Then remove it from the code, commit the removal, push.
3. Mention the leak — don't hide it. The user needs to understand the
   rotation step.
