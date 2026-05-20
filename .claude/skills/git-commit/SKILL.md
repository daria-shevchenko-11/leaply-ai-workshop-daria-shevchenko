---
name: git-commit
description: Save the user's changes as a Git commit. You run all the git commands yourself — local git is safe in your sandbox. Translate every step into plain English for the user.
---

# Saving work (Git commits) for a non-technical user

The user said something like _"save this"_, _"keep this version"_,
_"I want to remember this state"_. They mean: **make a Git commit**.
They do not know the words "commit", "branch", "stage", or "diff".

**You run all the git commands yourself.** `git status`, `git add`,
`git commit`, `git log` — all of these are local, sandbox-safe, and
should not require the user to paste anything. Only `git push` is
delegated to the user (see `github-publish` skill). See Rule 0 in
`CLAUDE.md`.

## Step 1 — See what's changed

Run:

```bash
git status
```

Translate the output into a plain-English bullet list:
_"You've changed 3 files: the home page, the button component, and
the styles."_

## Step 2 — Safety checks

Before staging, verify (from the `git status` output):

- **No secrets are about to be saved.** Look for: `.env`, `.env.local`,
  `credentials.json`, any file containing `KEY=`, `TOKEN=`, `SECRET=`,
  or `_API_KEY`. If any of those appear in the change list, **stop**.
  Tell the user, in plain English, what's wrong and offer to add the
  file to `.gitignore` first. Never proceed past this gate silently.
- **No huge files (> 5 MB).** Ask first if you see one.

## Step 3 — Stage and commit

Stage specific files when you can; `git add .` is acceptable only
after the safety checks pass and the changes are clearly all one
intent.

```bash
git add app/page.tsx components/contact-form.tsx
```

Commit with a short imperative English message describing the
user-visible change, not the implementation:

- ✅ `Add contact form to homepage`
- ✅ `Fix dark mode toggle on mobile`
- ✅ `Update pricing copy`
- ❌ `wip`, `changes`, `Refactored useEffect dependency array`

For multi-line messages use a heredoc:

```bash
git commit -m "$(cat <<'EOF'
Add contact form to homepage
EOF
)"
```

The pre-commit hook (husky + lint-staged) will auto-format and
lint-fix staged files. You read the hook output and translate it for
the user only if something interesting happened (a failure, or a
formatting fix worth noting).

## Step 4 — Confirm in plain English

After the commit succeeds:

> Saved! You have 5 snapshots total now. Want to keep going, or
> publish this version to GitHub?

(`git rev-list --count HEAD` gives you the snapshot count if you
want it.)

## If the commit fails (pre-commit hook caught something)

The hook found a TypeScript error, a lint error, or a formatting
problem Prettier couldn't auto-fix. The commit did **not** happen —
the user's edits are still safe in their files.

1. Read the hook output. Find the file and line.
2. **Fix the actual problem** via your file tools.
3. Re-stage and commit again (a **new** commit, not `--amend`).

Tell the user in plain English what happened: _"There was a typo in
the email validation — I fixed it and saved the snapshot."_

## What you must NOT do

- ❌ Skip hooks (`--no-verify`, `--no-gpg-sign`). Ever.
- ❌ Run `git reset --hard`, `git checkout .`, `git clean -fd`, or any
  command that throws away the user's work without an explicit "yes,
  discard my changes" from them.
- ❌ Use `--amend` unless the user explicitly says "fix the last
  save". Surprise rewrites confuse them — they read commit history
  on GitHub.
- ❌ Run `git push` as part of saving. Saving (commit) and publishing
  (push) are separate concepts — and `git push` is the user's command
  to paste (it needs their credentials). See
  `.claude/skills/github-publish/SKILL.md`.
- ❌ Commit `.env*` files. They're in `.gitignore` already; verify
  before staging.
