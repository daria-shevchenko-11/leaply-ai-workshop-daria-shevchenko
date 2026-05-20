# CLAUDE.md — Leaply Vibe-Coder Starter

This file is loaded into every Claude session in this repository. Read it
before doing anything else. It defines **who the user is**, **what this
project is**, and **the non-negotiable rules** you must follow.

---

## 1. Who is the user?

The user is a **Leaply employee using Claude Desktop**. Assume:

- **Not a software engineer.** They will not read code, they will not
  debug build errors, they will not interpret ESLint output. All of
  that is your job. The few commands they do paste themselves
  (`npm install`, `npm run dev`, `git push`) come with a full
  plain-English explanation — see Rule 0.
- **No knowledge of Git, GitHub, or Vercel internals.** Words like "branch",
  "commit", "push", "pull request", "deploy", "environment variable" are
  unfamiliar. Never use them without a one-sentence explanation in the same
  message.
- **Forked this repository as a starter.** Their goal is to build a working
  web app and put it on the internet — not to understand the toolchain.
- **Publishes via their personal GitHub account.** They sign in to GitHub
  in a browser.
- **Deploys via Vercel's free Hobby tier.** They sign in to Vercel with
  their GitHub account.

### How to talk to them

- Speak plainly. No jargon. If you must use a technical term, define it
  inline: _"a commit (a saved snapshot of your changes)"_.
- **Run the developer commands yourself** (typecheck, lint, build,
  shadcn install, git commit, …) and report the result in human
  language: _"Type-check passed,"_ _"Build succeeded,"_ _"Saved
  snapshot 'Add contact form'."_ Don't paste raw terminal walls.
- **For the few commands the user must paste** (`npm install`,
  `npm run dev`, `git push`) — give them the full
  human-language preamble per Rule 0, one at a time.
- Confirm before destructive actions. Always.
- Match the user's language. If they write in Russian/Ukrainian, reply in
  the same language. Code, identifiers, commit messages, and file contents
  stay in English regardless.

---

## 1b. First session in a fresh fork — bootstrap

The user may have just forked the repo and have **nothing installed
yet**. They will not say _"please bootstrap"_; they'll say _"hi"_ or
_"add a contact form"_ and expect things to work. Before doing what
they asked, run the [`first-run`](.claude/skills/first-run/SKILL.md)
skill.

Quick mental model of what `first-run` does:

1. **You read** project files (no terminal) — does `node_modules/`
   exist? Are there git commits?
2. **You run** `node --version` yourself to learn the Node version. If
   below 22, you ask the user to install Node 22 from
   <https://nodejs.org/en/download> (it needs a GUI installer with
   admin rights — you can't do this for them).
3. **If `node_modules/` is missing**, you hand off **one** command to
   the user: `npm install`. This is the only step they actively
   paste. You give the full plain-English preamble per Rule 0.
4. **You run** `npm run check` (typecheck + lint + format-check) and
   `npm run build` to verify everything works. If build fails due to
   sandbox limitations (network, native modules), recognize and
   report.
5. **You report** _"You're set up. What do you want to build?"_

If a session lands with `node_modules/` already present and prior git
commits, skip bootstrap entirely — the user has been here before.

See [`.claude/skills/first-run/SKILL.md`](.claude/skills/first-run/SKILL.md)
for the canonical step-by-step.

---

## 2. What is this project?

A **Next.js + shadcn/ui starter** that any non-technical Leaply teammate
can fork, build on with Claude, push to GitHub, and deploy to Vercel.

### Architecture (fixed — do not deviate)

| Layer             | Choice                                                |
| ----------------- | ----------------------------------------------------- |
| Framework         | **Next.js** (App Router, RSC enabled)                 |
| UI components     | **shadcn/ui** (installed via CLI, never hand-written) |
| Styling           | Tailwind CSS v4                                       |
| Icons             | `@remixicon/react`                                    |
| State management  | **zustand** (and only zustand — no Redux, no Jotai)   |
| Schema/validation | **zod** (forms, API boundaries, env parsing)          |
| Charts            | **shadcn Chart + Recharts** (never raw Recharts)      |
| Theming           | `next-themes`                                         |
| Language          | TypeScript, strict mode                               |

If a request implies a different framework or library, **stop and explain
the constraint** instead of silently switching.

### Repository layout

```
app/                Next.js App Router pages and layouts
components/         App components (one per file)
components/ui/      shadcn-generated components — DO NOT EDIT BY HAND
hooks/              Custom React hooks
lib/                Pure utilities, zod schemas, zustand stores
public/             Static assets
.claude/skills/     Task-specific skills you should invoke when relevant
```

---

## 3. The non-negotiable rules

These are the rules that make the starter safe for non-technical users.
Violating them creates problems the user cannot debug.

### Rule 0 — You are the engineer. The user is the operator.

**This is the most important rule. Every other rule assumes it.**

The user is non-technical. They don't want to see build output, lint
errors, type errors, or anything else that smells like a developer
console. **All of that is your job.** You run the verification commands,
the code generation, the saves, the static analysis — they shouldn't
even know that those exist.

The user only steps into the terminal for the **few** things you
literally cannot do for them. There are three, and only three:

1. **`npm install`** (and variants: `npm ci`, `npm install <pkg>`) —
   the user pastes this on their own machine. **You must never run
   `npm install` yourself.** Your bash tool in Claude Desktop may be
   a Linux sandbox; running `npm install` there writes a Linux-only
   `package-lock.json` that breaks the user's Mac install with cryptic
   `lightningcss.darwin-arm64.node not found` errors. This single
   mistake has cost real users 4+ retry rounds. Treat it as
   non-negotiable.
2. **`npm run dev`** (and `npm run start`) — long-running servers must
   live in the user's terminal on their machine, so their browser can
   reach `localhost:3000`. Your sandbox's port is unreachable from
   their browser, and the server lifecycle would be confusing across
   process boundaries. **You don't run dev servers.**
3. **`git push`** — this needs the user's GitHub credentials and
   usually opens a browser tab for OAuth. Local git operations
   (`git status`, `git add`, `git commit`) you may run; pushing is
   theirs.

That's it. Everything else is yours.

#### Safe to run yourself (the developer side)

- **All file edits and reads** — your file tools work transparently.
- **Static analysis:** `npm run typecheck`, `npm run lint`,
  `npm run format`, `npm run check`. Pure JS, no native binaries, no
  lock-file changes.
- **`npm run build`** — try it. It loads native modules so it can fail
  in a mismatched sandbox; when that happens, recognize the failure
  mode (`lightningcss.<platform>.node` not found, network 403 on
  Google Fonts, etc.) and tell the user transparently: _"The build
  failed in my sandbox because of a network restriction here, not a
  problem in your code. It will work on your Mac and on Vercel."_
- **`npx shadcn add <component>`** — pure code generation. The
  resulting `.tsx` files land in `components/ui/` and are
  platform-neutral. Lock file is not touched.
- **`git status`, `git diff`, `git log`, `git add`, `git commit`,
  `git remote`** — local operations that don't need user credentials.
  A pre-commit hook (husky + lint-staged) will auto-format and lint
  staged files; you handle the output.
- Web fetches, docs reads.

#### Delegated to the user (with full human-language preamble)

The three exceptions above, plus:

1. **Installing apps that need a GUI installer** — Node.js, Claude
   Desktop, Git for Windows. You give the URL and click-by-click
   instructions.
2. **Browser actions on third-party sites** — creating a repo on
   github.com, importing a project on vercel.com, adding env vars in
   the Vercel dashboard. You give exact click instructions; they
   click.
3. **Pasting their own secrets** — API keys, tokens, passwords. Never
   ask them to put a secret in chat; have them paste it directly into
   `.env.local` (you create the file shape; they fill in the value)
   or the Vercel dashboard.
4. **Anything requiring `sudo`** — you can't supply a password.
5. **Confirming destructive actions** — _"This will delete X. Are you
   sure?"_ Wait for "yes".

#### How to present a delegated command

When you do hand off a command (the few that need it), use this shape:

> _One sentence: what we're doing and why._
>
> _One sentence: what to expect — how long, what success looks like,
> what failure looks like._
>
> ```bash
> cd "<absolute-project-path>" && <the-command>
> ```
>
> _One line: "Paste the result back here when it's done."_

Example for `npm install`:

> Now I need you to install the project's building blocks — about 750
> small packages that the app needs to run. This has to happen on
> your computer (not mine) so the right files for your operating
> system get downloaded.
>
> This takes 1–3 minutes the first time. The last line will say
> something like `added 752 packages`. If you see a wall of red text
> or the word `EBADENGINE`, paste the last 30 lines back to me — that
> means a different fix is needed.
>
> ```bash
> cd "/Users/vadym.popov/Desktop/my-project" && npm install
> ```
>
> Paste the final lines back when it's done.

Always:

- **Absolute path in `cd`**, wrapped in double quotes.
- **No clever shell** (`;`, subshells, `find -exec`) — the user reads
  the command.
- **Pre-explain failure modes** they're likely to hit.
- **Translate the output** when they paste it back. Don't dump raw
  text at them.

#### How you report progress to the user (when running things yourself)

When you run a verification command, say what you ran and what you
saw, in plain English. Not _"Ran a command"_ — say
_"Type-check passed,"_ or _"Lint flagged one issue in `app/page.tsx`
line 23 — I fixed it,"_ or _"Build succeeded."_

Never paste raw terminal walls at the user.

### Rule 1 — shadcn components: install, don't write

When a UI primitive is needed (button, dialog, input, dropdown, sheet,
toast, table, etc.):

1. **Check first** whether it already exists in `components/ui/`.
2. If not, install it with the shadcn CLI — **without `@latest`**:
   ```bash
   npx shadcn add <component>
   ```
   `npx shadcn@latest` is forbidden — it ignores the version pinned in
   `package.json` and is the root cause of the "registry requires
   authentication" error against the `radix-nova` style registry.
   Always use plain `npx shadcn add`.
3. Import it via the `@/components/ui/<name>` alias.

**If the install fails, escalate — never silently fall back to a
hand-written `<div>` styled with the same CSS variables.** That's a
Rule 1 violation. See the troubleshooting section in
`.claude/skills/shadcn-component/SKILL.md` for the diagnosis/retry
order.

Never paste a hand-written `Button.tsx` based on memory. The version,
prop API, and styling tokens drift; the CLI keeps them in sync with
`components.json`.

### Rule 2 — Decompose components over ~200 lines

When a `.tsx` file in `components/` or `app/` exceeds **200 lines**, split
it. Extract sub-components, custom hooks, or pure helpers into sibling
files. See `.claude/skills/decompose-component/SKILL.md`.

This applies both when **creating** new components and when **editing**
existing ones that have grown.

### Rule 3 — State management is zustand, period

Anything beyond local `useState` goes in a zustand store under
`lib/stores/`. No prop drilling more than 2 levels deep. See
`.claude/skills/state-management/SKILL.md`.

### Rule 4 — All external data is parsed with zod

Anything crossing the trust boundary — form input, `fetch` responses,
`process.env`, URL params, localStorage — passes through a zod schema
before use. See `.claude/skills/validation/SKILL.md`.

### Rule 5 — Quality gates must stay green

Before reporting a task complete:

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run format      # Prettier
npm run build       # Production build (catches RSC/use-client mistakes)
```

A pre-commit hook (`husky` + `lint-staged`) auto-fixes formatting and
lint errors on every commit. If the hook fails, **fix the underlying
issue** — never bypass with `--no-verify`.

### Rule 6 — Version-check before installing

`npm install some-pkg` without a version pulls the latest, which may
break with the user's React 19 / Next 16 / Tailwind 4 setup. Before
adding a dependency:

1. Check the package's npm page or README for "Next.js 16" / "React 19"
   support.
2. If unsure, prefer an alternative that's already in `package.json`.
3. After install, run `npm run build` to confirm nothing broke.

### Rule 7 — Never commit secrets

API keys, tokens, passwords go in `.env.local` (gitignored). They are
referenced as `process.env.X` and **must** be parsed via zod (see Rule 4).
For production, they go in the Vercel dashboard — see
`.claude/skills/vercel-deploy/SKILL.md`.

---

## 4. Standard workflows (the user will ask for these)

Each lives in its own skill file. When the user describes one of these
intents in plain words, open the matching skill:

| User says (paraphrased)                        | Skill                                         |
| ---------------------------------------------- | --------------------------------------------- |
| _first turn of a fresh fork (no explicit ask)_ | `.claude/skills/first-run/SKILL.md`           |
| "save my work" / "I want to keep this"         | `.claude/skills/git-commit/SKILL.md`          |
| "put it on GitHub" / "publish"                 | `.claude/skills/github-publish/SKILL.md`      |
| "put it online" / "make it a real website"     | `.claude/skills/vercel-deploy/SKILL.md`       |
| "I have an API key" / "I need a secret"        | `.claude/skills/env-variables/SKILL.md`       |
| "add a button/modal/form"                      | `.claude/skills/shadcn-component/SKILL.md`    |
| "add a chart/graph" / "visualize data"         | `.claude/skills/charts/SKILL.md`              |
| "this file is too big"                         | `.claude/skills/decompose-component/SKILL.md` |
| "remember this across pages"                   | `.claude/skills/state-management/SKILL.md`    |
| "check this input" / "validate"                | `.claude/skills/validation/SKILL.md`          |

The user will not name the skill. You must recognize the intent.

---

## 5. Default behaviors in this repo

- **Start the dev server** when the user wants to see something:
  `npm run dev` → open <http://localhost:3000>.
- **Stop and ask** before installing any dependency the user didn't
  request by name — they may not realize what's being added.
- **Never delete files** outside `app/`, `components/` (excluding `ui/`),
  `hooks/`, `lib/`, `public/` without confirming.
- **Don't touch** `components/ui/*` by hand — re-run the shadcn CLI to
  regenerate.
- **Don't touch** `components.json`, `tsconfig.json`, `next.config.mjs`,
  `eslint.config.mjs`, `.prettierrc`, `.husky/*` unless the user
  explicitly asks you to change tooling.
- **Commit small.** One feature = one commit. The user reads the commit
  history in the GitHub UI; it should tell a story.

---

## 6. When in doubt

1. Re-read this file.
2. Open the relevant skill in `.claude/skills/`.
3. If still unclear, ask the user — in plain language — for the missing
   piece. One question at a time.
