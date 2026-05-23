import Link from "next/link"
import { BriefForm } from "@/components/brief-form"
import { DemoModeToggle } from "@/components/demo-mode-toggle"
import { PipelineVisualizer } from "@/components/pipeline-visualizer"

export default function Page() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Top nav between two tools */}
        <nav className="mb-6 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium">
            🎣 Hook Factory
          </span>
          <span className="text-muted-foreground">·</span>
          <Link
            href="/production-sheet"
            className="rounded-md border border-muted bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            🎬 Production Sheet
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            href="/kling-test"
            className="rounded-md border border-muted bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            🧪 Kling Test
          </Link>
        </nav>

        <header className="mb-4 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            🎣 Hook Factory{" "}
            <span className="text-sm font-semibold tracking-widest text-primary">
              LEAPLY
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Strategic hook router for Leaply — analyze a reference, map to
            existing Core Messages, generate new variants.
          </p>
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Step 1 of 5 · Collect
          </p>
        </header>

        <div className="mb-4">
          <PipelineVisualizer />
        </div>

        <div className="mb-6">
          <DemoModeToggle />
        </div>

        <BriefForm />
      </div>
    </div>
  )
}
