import { BriefForm } from "@/components/brief-form"
import { DemoModeToggle } from "@/components/demo-mode-toggle"
import { PipelineVisualizer } from "@/components/pipeline-visualizer"

export default function Page() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
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
