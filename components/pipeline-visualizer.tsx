"use client"

// Leaply funnel pipeline visualizer — shows where this tool lives.
// Active stage is the first one (Creo) since this builds creo assets.

const PIPELINE = [
  { stage: "Creo", icon: "🎯", desc: "Hook + Body" },
  { stage: "Quiz", icon: "❓", desc: "Marketing funnel" },
  { stage: "Purchase", icon: "💳", desc: "Subscription" },
  { stage: "Register", icon: "✍️", desc: "Account" },
  { stage: "Upsells", icon: "📈", desc: "Add-ons" },
  { stage: "App", icon: "📱", desc: "LMS / iOS" },
] as const

export function PipelineVisualizer() {
  return (
    <div className="rounded-md border bg-muted/30 px-4 py-3">
      <div className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        Leaply Funnel · where this lives
      </div>
      <div className="flex items-center gap-1 overflow-x-auto">
        {PIPELINE.map((p, i) => (
          <div key={p.stage} className="flex shrink-0 items-center gap-1">
            <div
              className={`flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1 ${
                i === 0
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-muted bg-background text-muted-foreground"
              }`}
            >
              <span aria-hidden className="text-sm">
                {p.icon}
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] leading-tight font-semibold">
                  {p.stage}
                </span>
                <span className="text-[9px] leading-tight text-muted-foreground">
                  {p.desc}
                </span>
              </div>
            </div>
            {i < PIPELINE.length - 1 && (
              <span className="text-muted-foreground/40" aria-hidden>
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
