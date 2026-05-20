# Leaply Starter — build a web app with Claude

This is the **Leaply starter project**. It's set up so anyone — even if
you've never written code — can build a real web app by chatting with
Claude, put it on GitHub, and publish it to the internet for free.

## How this works (read this first)

**You don't write code. You don't read build errors. You don't click
around in Git.** You talk to Claude in Claude Desktop, in plain
English, and Claude does the engineering work:

- Editing your files, adding components — Claude.
- Type-checking, linting, building, fixing errors — Claude.
- Saving versions (commits) in Git — Claude.
- Talking to shadcn / installing UI primitives — Claude.

**You only step in for the few things Claude literally cannot do for
you. There are basically three of them:**

1. **Three terminal commands** you paste once each, when Claude asks.
   Claude gives you the exact line and explains in plain English what
   it does:
   - `npm install` — once per project, to download the building
     blocks onto **your** computer (not Claude's). About 2 minutes.
   - `npm run dev` — to start the live preview at
     `http://localhost:3000`. Stays running in your terminal.
   - `git push` — to send your project to GitHub. Needs **your**
     GitHub sign-in.
2. **Installing apps** (Claude Desktop itself, Node.js, Git for
   Windows). One-time, ~10-minute installer windows.
3. **Clicking buttons on websites you log into** — creating a repo on
   github.com, importing a project on vercel.com, pasting API keys
   into the Vercel dashboard. Claude tells you exactly where to click.

That's it. Everything else is _"Hey Claude, do X"_.

---

## What's in the box

A modern web app foundation:

- **Next.js** — the framework that runs the app.
- **shadcn/ui** — a library of polished UI components (buttons, dialogs,
  forms, etc.). Claude adds them by command, never by hand.
- **Tailwind CSS** — styling.
- **TypeScript** — type-safe code, fewer bugs.
- **zustand** — for remembering things across pages (themes, carts,
  user preferences).
- **zod** — for validating anything coming from outside the app (forms,
  API responses, settings).
- **Recharts** (via shadcn Chart) — for line, bar, area, and pie
  charts that match your app's theme.
- **Prettier + ESLint + Husky** — auto-formats and checks your code
  every time you save a snapshot, so it stays clean.

You don't need to know what any of this is. Claude does.

---

## First-time setup (~10 minutes of your time, mostly waiting)

Open Claude Desktop in this project folder and say _"hi"_ (or _"set
me up"_). Claude takes it from there and tells you what to do, one
small step at a time. The whole flow looks like this:

### What Claude does

- Checks what's installed on your computer.
- If a developer tool is missing, tells you exactly which app to
  download and where to click.
- Once tools are in place, asks you to paste **one** install command
  (about 2 minutes of waiting).
- Then runs the type-check, lint, and build itself to verify
  everything works.
- Reports _"You're set up — what do you want to build?"_

### What you do

You install **two apps** yourself (they need admin / a real
installer):

1. **Claude Desktop** — from <https://claude.ai/download>. Install it
   like any other app, sign in with your Leaply account.
2. **Node.js (version 22 LTS)** — from
   <https://nodejs.org/en/download>. Click the big green **LTS**
   button, run the installer, accept all defaults. (Claude can't do
   this for you — it needs your computer's admin password.)

(Optional: on **Windows** only, you might also need **Git** from
<https://git-scm.com/download/win>. On Mac it's already there, and
Claude will tell you if it isn't.)

Then you paste **one** command when Claude asks you to — the
`npm install` line. Claude gives you the exact text in a code block;
you copy-paste into your terminal, press Enter, wait 1–3 minutes, and
paste the last few lines back to Claude. That's it.

### Why does the install have to be on your side?

The short version: `npm install` downloads building blocks that match
**your** operating system. If Claude ran it on its side, you'd get
the wrong files for your computer and we'd be stuck untangling weird
errors. So this one command lives in your terminal — always.

You won't have to think about this again after the first install.

---

## How to work with Claude on this project

Open this folder in Claude Desktop. Then ask in plain English. Some
examples:

- _"Add a contact form to the home page."_
- _"Make the header dark blue."_
- _"Add a button that opens a popup with our pricing."_
- _"Remember the user's favorite color across pages."_
- _"I have an OpenAI API key — how do I use it safely?"_
- _"Save this version."_ → Claude creates a Git snapshot.
- _"Put it on GitHub."_ → Claude walks you through publishing.
- _"Put it online as a real website."_ → Claude walks you through
  deploying to Vercel (free).

Claude already knows the project's conventions because of two files:

- `CLAUDE.md` — main instructions Claude reads every session.
- `.claude/skills/` — focused guides for specific tasks (saving,
  publishing, deploying, adding components, …).

You never need to read those — but they're there if you're curious.

---

## Seeing your app while you build

Just say: _"Show me the app."_ or _"Start the preview."_

Claude gives you **one** command to paste into your terminal (your
preview server runs on your computer, not Claude's, so your browser
can reach it). Something like:

```bash
cd "/path/to/your/project" && npm run dev
```

You paste, press Enter, the terminal shows a `http://localhost:3000`
link, and you open that in your browser. The page reloads
automatically every time Claude changes something.

When you're done for the day: go to the terminal window where the
server is running and press **Ctrl + C** to stop it. (Or just close
the terminal.)

---

## The three things Claude can help you do end-to-end

### 1. Save your work

Whenever you want to keep a version you can come back to, say:

> _"Save this."_

Claude takes a snapshot (a "commit") with a clear name describing what
changed.

### 2. Publish to GitHub

When you're ready for your code to live online (not the website yet —
just the source code), say:

> _"Put my project on GitHub."_

Claude will walk you through creating a GitHub repository in your
browser and connecting this project to it.

### 3. Deploy a live website (free)

To turn it into a real public website with a URL you can share, say:

> _"Make this a live website."_

Claude will walk you through Vercel's free plan. Every time you save
and publish a new version afterward, the website updates automatically.

---

## If something looks wrong

- **The page won't load** → ask Claude: _"The page isn't loading. Can
  you check?"_
- **Claude proposes a change you don't understand** → ask: _"Explain
  this in simpler words."_
- **You deployed and the live site is broken** → ask: _"My Vercel
  deployment failed. Can you help me check the logs?"_

Claude knows what to do in each of these cases.

---

## Don't touch (unless you know what you're doing)

These files keep everything wired together. Editing them by hand will
likely break things. Let Claude handle them:

- `package.json`, `package-lock.json`
- `tsconfig.json`, `next.config.mjs`
- `components.json`, `eslint.config.mjs`, `.prettierrc`
- `.husky/`
- Anything in `components/ui/` (those are auto-generated)

---

Built for Leaply. Happy vibe-coding. ✦
