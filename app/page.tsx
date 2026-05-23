import { BriefForm } from "@/components/brief-form"
import { DemoModeToggle } from "@/components/demo-mode-toggle"

export default function Page() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            🎣 Hook Factory
          </h1>
          <p className="text-sm text-muted-foreground">
            Strategic hook router for Leaply — analyze a reference, map to
            existing Core Messages, generate new variants.
          </p>
          <p className="text-xs text-muted-foreground">Step 1 of 3 — Brief</p>
        </header>

        <div className="mb-6">
          <DemoModeToggle />
        </div>

        <BriefForm />
      </div>
    </div>
  )
}
