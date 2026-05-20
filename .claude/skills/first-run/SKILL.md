---
name: first-run
description: Bootstrap a freshly forked / cloned project. You run everything except `npm install` (which the user pastes, because lock-file pollution from a Linux sandbox is real). Detect missing prerequisites and hand off only what you literally cannot do.
---

# First-run bootstrap

The user just forked the repo and opened it in Claude Desktop for the
first time. They probably said something casual like _"hi"_, _"let's
start"_, or _"add a contact form"_. Before doing what they asked, run
this bootstrap.

## The labor split for this skill

**You run** (no user involvement, just report results in plain English):

- `node --version` to check the Node version.
- `git --version` to confirm Git is installed.
- `ls node_modules/` (or your file tools) to check whether deps are
  installed.
- `npm run check` after install, to verify static analysis passes.
- `npm run build` to verify the production build, with awareness that
  it can fail in your sandbox due to network or native-module quirks
  that won't happen on the user's machine.

**The user pastes** (with full Rule-0 preamble):

- **`npm install`** — has to happen on their hardware. Pasting this is
  the only terminal command they should have to do in a successful
  bootstrap.
- **Node 22 GUI install from <https://nodejs.org>** — if their Node is
  too old or missing (they can't avoid this, it needs admin rights).

## Step 1 — Check Node.js (you run this)

```bash
node --version
```

| Output                | What to do                                                                       |
| --------------------- | -------------------------------------------------------------------------------- |
| `v22.x.x` or higher   | Move to Step 2. Don't mention the version — it's noise.                          |
| `v20.x.x` / `v18.x.x` | **Hard block.** Walk the user through Node 22 install (Step 1a). Do not proceed. |
| `command not found`   | **Hard block.** Walk the user through Node 22 install (Step 1a).                 |

**Why hard-block on Node < 22**, even though npm just warns: Tailwind
v4 ships native binaries (`lightningcss`) whose prebuilds for darwin-
arm64 and other platforms require Node 22+. On Node 20 the install
silently skips the native binding and you get a `Cannot find module
'../lightningcss.darwin-arm64.node'` error that looks like a
file-system bug. Don't waste user time debugging that — block early.

### Step 1a — Install Node 22 (only if needed)

The Node installer needs admin privileges, so the user has to do it
themselves. Tell them, in plain English:

> Your computer doesn't have Node.js installed (or has an old version).
> Node.js is the engine that runs the app. We need version 22, which is
> a one-time, ~3-minute install.
>
> 1. Open <https://nodejs.org/en/download> in your browser.
> 2. Click the big green **LTS** button (it currently shows "22.x.x
>    LTS" — that's what we want).
> 3. The browser downloads a `.pkg` (Mac) or `.msi` (Windows) file.
>    Double-click it.
> 4. Click **Continue / Next** through every screen, accept the
>    license, click **Install**. If your computer asks for your
>    password, type it.
> 5. When you see "Installation successful", close the installer.
> 6. **Important:** quit Claude Desktop completely (`Cmd+Q` on Mac)
>    and re-open it so it picks up the new Node.
> 7. Come back and say "done" — I'll re-check.

When they come back, run `node --version` again. Don't proceed until
it's `v22.x.x` or higher.

## Step 2 — Check whether deps are installed (you do this, no terminal)

Use your file tools to check for `node_modules/package.json`:

- **Present** → deps are installed. Skip to Step 4 (`npm run check`).
- **Missing** → hand off `npm install` to the user (Step 3).

## Step 3 — Hand off `npm install` to the user

You must **not** run this yourself. See Rule 0 in `CLAUDE.md`.

Give them the command with full preamble:

> Now I need you to install the project's building blocks — about 750
> small packages that the app needs to run. This step has to happen on
> your computer (not mine) so the right files for your operating
> system get downloaded — running it from my side would give you the
> wrong ones.
>
> This takes 1–3 minutes the first time. The last line will say
> something like `added 752 packages`. If you see a wall of red text
> or the word `EBADENGINE`, paste the last 30 lines back to me — that
> means a different fix is needed.
>
> ```bash
> cd "<absolute-project-path>" && npm install
> ```
>
> Paste the final lines back when it's done.

(Replace `<absolute-project-path>` with the actual path. Look at your
working directory — typically `/Users/<user>/Desktop/<project>` on
Mac.)

### Common `npm install` failures

- **`EBADENGINE` mentioning Node 20** → They're somehow still on
  Node 20. Send them back to Step 1a.

- **`EACCES` / permission denied** → A past `sudo npm install`
  corrupted their `~/.npm` cache. You can't fix this — it needs
  `sudo`. Tell them:

  > Your computer has a leftover permissions issue from an old install.
  > One-line fix; your computer will ask for your login password (no
  > characters show as you type — that's normal).
  >
  > ```bash
  > sudo chown -R $(whoami) ~/.npm
  > ```
  >
  > After that, run the install again:
  >
  > ```bash
  > cd "<absolute-project-path>" && npm install
  > ```

- **`Cannot find module '../lightningcss.<platform>.node'`** →
  `package-lock.json` was generated on a different OS. The fix is to
  regenerate it on their machine:

  > The lock file remembers which files belong to which operating
  > system, and right now it remembers the wrong ones for your
  > computer. We need to delete it and let `npm install` rebuild it.
  >
  > ```bash
  > cd "<absolute-project-path>" && rm -rf node_modules package-lock.json && npm install
  > ```
  >
  > 1–2 minutes. Paste the final lines back.

## Step 4 — Verify static analysis (you run this)

```bash
npm run check
```

This runs `typecheck` + `lint` + `format:check`. Pure JS, no native
binaries — safe across platforms. Report the result in one sentence:
_"Everything checks out,"_ or _"Lint flagged a stale import in
`app/layout.tsx` — let me fix it,"_ then fix it via file tools.

## Step 5 — Verify the build (you run this, with awareness)

```bash
npm run build
```

This loads Tailwind's native CSS engine. Possible outcomes:

- **Green build** → report _"Build succeeded."_, move on.
- **Build fails on `lightningcss.<platform>.node`** → your sandbox is
  on a different platform than the user's machine. **Don't try to
  fix this.** Tell the user transparently: _"The build failed in my
  sandbox because of a platform mismatch on my side; this is not a
  problem in your code. It will work on your Mac and on Vercel."_
- **Build fails on `fonts.googleapis.com` 403 / network error** → your
  sandbox blocks Google Fonts. Same transparent message: _"My sandbox
  can't reach Google Fonts; your machine and Vercel can — your code
  is fine."_
- **Build fails on actual code error** → diagnose, fix via file
  tools, re-run.

## Step 6 — Make a baseline commit if there are none

If `git rev-list --count HEAD` returns 0 or fails (fresh template
clone), make a baseline commit so the user has something to roll back
to. Use the `git-commit` skill's safety checks (no secrets, no huge
binaries). Commit message: `Baseline — starter as forked`.

## Step 7 — Tell the user we're ready

> You're set up. What do you want to build?

## When to skip this whole skill

If `node_modules/` already exists AND there are prior git commits, the
user has been here before. Just glance at `node --version` (one-line
report only if it's wrong) and move on. Don't repeat bootstrap.

## What you must NOT do

- ❌ Run `npm install` yourself. The single biggest mistake — see
  Rule 0 in `CLAUDE.md`. Your sandbox may be Linux; the resulting
  `package-lock.json` will permanently break the user's macOS install
  with `lightningcss.darwin-arm64.node not found` errors that take
  multiple rounds to undo.
- ❌ Run `npm run dev` yourself. Servers live in the user's terminal.
- ❌ Let the user proceed past Step 1 with Node < 22.
- ❌ Skip plain-English progress updates. _"Ran a command"_ tells the
  user nothing. Say what you ran and what you saw.
