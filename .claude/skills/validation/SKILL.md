---
name: validation
description: Validate untrusted input (forms, fetch responses, env vars, URL params, localStorage) with a zod schema before use.
---

# Validation with zod

**Anything that crosses a trust boundary gets parsed by zod** before the
rest of the code touches it. This catches bugs at the edge instead of
deep in render logic where they're hard to trace.

Trust boundaries in this app:

- Form input from the user
- `fetch()` / API responses
- `process.env`
- URL search params, route params
- `localStorage` reads (including zustand persist hydration)
- File uploads, JSON pasted by the user

## Where schemas live

`lib/schemas/<name>-schema.ts`. One file per domain. Export both the
schema and the inferred type:

```ts
// lib/schemas/user-schema.ts
import { z } from "zod"

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.enum(["admin", "member", "viewer"]),
})

export type User = z.infer<typeof UserSchema>
```

Always derive the TS type from the schema with `z.infer<>` — never
declare a parallel `type User = { ... }`, they will drift.

## Pattern: validating a fetch response

```ts
import { UserSchema } from "@/lib/schemas/user-schema"

export async function getUser(id: string) {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return UserSchema.parse(json) // throws if shape is wrong
}
```

Use `.safeParse()` if you want to handle the error path explicitly:

```ts
const parsed = UserSchema.safeParse(json)
if (!parsed.success) {
  // parsed.error.issues — array of field-level errors
  return null
}
return parsed.data
```

## Pattern: forms with react-hook-form + shadcn Form

shadcn's `Form` component is built for this exact stack. Install the
form primitive once:

Two installs are needed:

1. **shadcn primitives** (you run this — code generation only):

   ```bash
   npx shadcn add form input label
   ```

2. **react-hook-form + resolvers** (this is `npm install`, so the
   **user pastes it** — see Rule 0; the lock file must be regenerated
   on their machine):

   > I need to add the form library to your project. This step has to
   > happen on your computer so the right files for your OS get
   > downloaded. Takes about 15 seconds. Last line says
   > `added 2 packages`.
   >
   > ```bash
   > cd "<absolute-project-path>" && npm install react-hook-form @hookform/resolvers
   > ```
   >
   > Paste the result back.

Then:

```tsx
"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const SignupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
})
type SignupValues = z.infer<typeof SignupSchema>

export function SignupForm() {
  const form = useForm<SignupValues>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { email: "", password: "" },
  })

  function onSubmit(values: SignupValues) {
    // values are already validated and typed
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Sign up</Button>
      </form>
    </Form>
  )
}
```

## Pattern: validating environment variables

Parse `process.env` once at startup. If a required var is missing, the
app fails fast instead of crashing deep in a request handler.

```ts
// lib/env.ts
import { z } from "zod"

const EnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1).optional(),
})

export const env = EnvSchema.parse(process.env)
```

Import `env` (not `process.env`) everywhere else.

## What you must NOT do

- ❌ Trust the shape of `await res.json()` without parsing.
- ❌ Hand-write a `type User = { ... }` alongside `UserSchema`.
- ❌ Validate the same data at multiple layers — parse once at the
  boundary, then pass the typed object inward.
- ❌ Use `any` to escape a validation problem. Fix the schema.
