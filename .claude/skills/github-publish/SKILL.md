---
name: github-publish
description: Help a non-technical user publish their fork to their personal GitHub account for the first time, or push subsequent updates. Walk through the GitHub UI and minimal CLI commands.
---

# Publishing to GitHub (for users who've never used GitHub)

The user said _"put it on GitHub"_, _"publish my code"_, _"upload my
project"_. They want their work visible on github.com under their
account.

**Division of labor (Rule 0):** you run all the local git commands
(`git remote`, `git branch`, `git status`, `git log`). The user only
does what you can't: clicking buttons on github.com, signing in, and
pasting the **`git push`** command (it needs their credentials and
usually opens a browser OAuth tab).

## Step 0 — Figure out where the project stands

Run these yourself, in parallel:

```bash
git remote -v
git status
git log --oneline -5
```

Translate the output for the user, in plain English: _"Right now your
project isn't connected to GitHub yet — let's set that up."_

Three possible situations:

| Situation                                   | Path                            |
| ------------------------------------------- | ------------------------------- |
| `origin` already points to **their** GitHub | "Push subsequent updates" below |
| `origin` points to the Leaply template repo | "First-time publish" below      |
| No `origin` set / fresh clone               | "First-time publish" below      |

## First-time publish

The user needs **their own** GitHub repository to push into. They create
it in the browser; you wire it up locally.

### 1. Walk them through creating the repo

Say (literally — copy this script):

> 1.  Open <https://github.com/new> in your browser.
> 2.  In **Repository name**, type a short name with no spaces — for
>     example, `my-leaply-app`.
> 3.  Choose **Private** if you don't want others to see the code, or
>     **Public** if you do.
> 4.  **Do not** check "Add a README", "Add .gitignore", or "Choose a
>     license" — your project already has those.
> 5.  Click **Create repository**.
> 6.  On the next page, you'll see a URL like
>     `https://github.com/your-username/my-leaply-app.git`. **Copy that
>     URL** and paste it back here.

Wait for the user to paste the URL.

### 2. Save uncommitted changes first

If the Step 0 output showed any uncommitted changes, run the
`git-commit` skill first — only saved snapshots can be pushed.

### 3. Wire up the remote (you run this)

With the URL the user pasted, run yourself:

```bash
git remote remove origin 2>/dev/null
git remote add origin <URL-the-user-pasted>
git branch -M main
```

These are local operations — no credentials needed.

### 4. Hand off the first push to the user

`git push` needs the user's GitHub credentials, and a browser tab
usually pops up for OAuth. You give them the command with full
preamble:

> Your project is now connected to GitHub. Last step: upload your
> saved versions there. This is the one command you need to paste —
> it needs your GitHub sign-in, which only you can do.
>
> When you paste it, a browser tab will pop up asking you to sign in
> to GitHub. Sign in there, come back to the terminal. When it
> succeeds you'll see a line like `* [new branch] main -> main`.
>
> If no browser opens automatically, the terminal will print a one-
> time code and a URL — open that URL in any browser and paste the
> code there.
>
> ```bash
> cd "<absolute-project-path>" && git push -u origin main
> ```
>
> Paste the result back — including any error.

If they hit `Authentication failed` and no browser opened, give them
the GitHub CLI install path:

> Your terminal doesn't know how to sign you in via browser yet.
> Let's install GitHub's official sign-in helper — one-time, ~30-second
> step.
>
> 1. Open <https://cli.github.com> → click the install button for
>    your operating system → run the installer.
> 2. Come back to the terminal and paste this. It opens a browser tab
>    to log you in, then retries the push.
>
> ```bash
> cd "<absolute-project-path>" && gh auth login && git push -u origin main
> ```
>
> When `gh auth login` asks questions, pick: GitHub.com → HTTPS →
> Login with a web browser → press Enter when it shows a one-time
> code, then paste the code in the browser tab.

### 5. Confirm

After the user confirms the push succeeded:

> Done — your code is now on GitHub. Open
> `https://github.com/<your-username>/<repo-name>` in your browser to
> see it. Want to put it online as a real website too?

## Pushing subsequent updates

After the first push, every "publish my changes" is one user paste:

> I'll send your latest saved snapshots up to GitHub. Takes a few
> seconds. Same as before, no sign-in needed this time (it'll
> remember).
>
> ```bash
> cd "<absolute-project-path>" && git push
> ```
>
> Paste the output back. If it says `Everything up-to-date`, there's
> nothing new — make sure I saved (committed) first.

Before any push, the changes must be **committed** — that's your job
(see `.claude/skills/git-commit/SKILL.md`).

## What you must NOT do

- ❌ Force-push (`git push --force` / `--force-with-lease`) without an
  explicit ask. It can erase work on the remote.
- ❌ Push to a repo that isn't the user's (e.g. the Leaply template's
  `origin`). Always confirm `git remote -v` shows their username.
- ❌ Run `gh repo create` silently — the user should create the repo in
  the browser so they understand they own it. The browser flow is
  pedagogical, not just procedural.
- ❌ Push `.env*` files. They're in `.gitignore` already; do not remove
  them from `.gitignore`.

## After publishing — next step

Most users will want to **deploy** (make it a live website) immediately
after their first push. Proactively suggest:

> _"Your code is on GitHub now. Want me to put it on the internet as a
> live website? It's free with Vercel."_

Then proceed with `.claude/skills/vercel-deploy/SKILL.md`.
