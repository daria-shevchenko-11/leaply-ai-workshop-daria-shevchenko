---
name: shadcn-component
description: Add a UI component (button, dialog, input, form, table, etc.) by installing it from shadcn/ui via the CLI. Never hand-write a primitive that exists in shadcn.
---

# Adding shadcn/ui components

The user wants a UI element (button, modal, form field, dropdown, sheet,
tooltip, table, etc.). Resist the urge to write it yourself — shadcn
already has it, and the CLI keeps it consistent with the rest of the app.

**You run the shadcn CLI yourself.** It's pure code generation — no
native binaries, no lock-file changes, no platform-specific output.
Safe across sandboxes. See Rule 0 in `CLAUDE.md` for what's yours vs.
the user's.

## Workflow

### 1. Check what's already installed

Look in `components/ui/`. If a file matching the component name exists,
**use it** — do not reinstall (that overwrites local edits).

```ts
import { Button } from "@/components/ui/button"
```

### 2. Confirm the component exists in shadcn

Browse <https://ui.shadcn.com/docs/components> mentally. Common ones:

`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `breadcrumb`,
`button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`,
`collapsible`, `command`, `context-menu`, `dialog`, `drawer`,
`dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`,
`menubar`, `navigation-menu`, `pagination`, `popover`, `progress`,
`radio-group`, `resizable`, `scroll-area`, `select`, `separator`,
`sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`,
`tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`.

If you're unsure whether shadcn ships the thing, ask the user to confirm
the visual, then check the registry rather than guessing.

### 3. Install via the CLI

Use `npx shadcn add` — **never** `npx shadcn@latest add`. This is
critical and counter-intuitive.

```bash
npx shadcn add button dialog input        # ✅ correct
npx shadcn@latest add button dialog input # ❌ DO NOT — see below
```

Why: this project pins `shadcn` in `package.json` (currently `^4.7.0`).
Plain `npx shadcn` resolves to that pinned version. Adding `@latest`
makes npm fetch whatever was just published, which can be:

- a canary release with broken behavior;
- a version with a new auth flow for the `radix-nova` style registry
  (this project uses `style: "radix-nova"` in `components.json`,
  which is a Radix-hosted themed registry, **not** the open default
  registry) — that's where the misleading "registry requires
  authentication" error comes from;
- a release whose schema doesn't match the locked `components.json`.

Multiple components per call is fine:

```bash
npx shadcn add button dialog input
```

The CLI reads `components.json` and drops files into `components/ui/`.

#### If the pinned CLI is genuinely too old

Bump the dep first (this is rare):

```bash
npm install shadcn@latest
```

Then commit the `package.json` / `package-lock.json` change. Note that
this **does** touch the lock file — if your sandbox might be on a
different OS than the user's, hand off the bump to the user:

> The shadcn installer in this project is too old for the current
> registry. Let's update it. This changes one line in `package.json`
> and refreshes the lock file. ~10 seconds.
>
> ```bash
> cd "<absolute-project-path>" && npm install shadcn@latest
> ```
>
> Paste the result back.

Otherwise, in same-platform sandboxes, run it yourself.

### 4. Report the result to the user in plain English

After running `npx shadcn add card`, tell the user, in one sentence:

> _"Added the Card component."_

Then keep going with the feature they actually asked for — they don't
need to see the install output.

### 4. Wire it up

Import via the `@/components/ui/<name>` alias. Compose, don't fork —
build your feature component **on top of** the primitive in a sibling
file under `components/`, not by editing the shadcn file.

```tsx
// components/save-dialog.tsx
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function SaveDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Save</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save your work</DialogTitle>
        </DialogHeader>
        {/* ... */}
      </DialogContent>
    </Dialog>
  )
}
```

## What you must NOT do

- ❌ Paste a hand-written `Button.tsx` based on memory.
- ❌ Edit files in `components/ui/` to "tweak" the primitive. Wrap it in
  a new component in `components/` instead.
- ❌ Mix in another UI library (MUI, Chakra, Mantine, HeadlessUI).
- ❌ Use `npx shadcn@latest` (see install section above).
- ❌ **Fall back to a hand-written `<div>` if the CLI errors out.**
  See "If the install fails" below — escalate, never silently
  replicate the component yourself with raw markup. This is the most
  common silent Rule 1 violation.

## If the install fails

When `npx shadcn add <component>` errors, **do not** write the
component by hand from memory. Stop, diagnose, and tell the user
clearly. Common failure modes:

### "Registry requires authentication" / 401 errors

Almost always a version-drift symptom, not a real auth problem. This
project uses `style: "radix-nova"` in `components.json`, which is a
Radix-hosted themed registry — its auth headers changed between
shadcn CLI releases.

**Fix order:**

1. **Confirm you ran `npx shadcn add ...`, not `npx shadcn@latest add ...`.**
   The `@latest` form ignores the pinned version and is the usual
   cause of this error. Re-run without `@latest`.
2. If you really did use the pinned version and it still fails, the
   pinned shadcn version itself is stale. Bump it:

   ```bash
   npm install shadcn@latest
   npx shadcn add <component>
   ```

   Commit the `package.json` change.

3. If both fail, the radix-nova registry may be temporarily down.
   Tell the user, in plain English: _"The shadcn registry is
   refusing requests right now. This usually clears up within an
   hour — want me to try again, or work on something else
   meanwhile?"_

### "Component not found"

The component name is wrong. Re-check the list in section 2 above,
or run `npx shadcn search @shadcn` to list everything available.

### Network errors

Retry once. If it still fails, ask the user to check internet — and
do not proceed to hand-writing.

### What to NEVER do when an install fails

Quoting a real failure mode seen in the wild:

> _"The registry requires auth — I'll just use a regular `<div>` with
> styles from the same CSS variables. Button already exists, that's
> enough."_

**This is wrong.** Hand-rolled markup based on memory:

- doesn't match the radix-nova primitive's actual styling tokens
- skips the accessibility wiring (focus management, ARIA, slot props)
- drifts as the design system evolves
- silently violates Rule 1

If the install genuinely cannot proceed, **tell the user the install
failed and ask whether to retry, bump the dep, or skip this feature**.
Do not paper over it.

## Forms

For any form, install both `form` and `input` (plus `label`, `select`,
etc. as needed). Forms are built with `react-hook-form` + `zod` — see
`.claude/skills/validation/SKILL.md`.

```bash
npx shadcn add form input label
```

## Toasts

Use `sonner` (the modern shadcn default). Add the `<Toaster />` to
`app/layout.tsx` once, then call `toast()` anywhere.

```bash
npx shadcn add sonner
```

## After installing

Run `npm run build` once to confirm the new files compile.
