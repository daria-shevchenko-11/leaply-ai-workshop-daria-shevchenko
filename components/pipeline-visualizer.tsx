"use client"

// 5-step progress indicator for the Hook Factory flow.
// Replaces the previous Leaply-funnel visualizer (which was irrelevant).
// Each step is clickable to allow click-through navigation in Demo Mode.

import { usePathname, useRouter } from "next/navigation"
import { useHookStore } from "@/lib/stores/hook-store"

const STEPS = [
  { n: 1, path: "/", label: "Collect", emoji: "📥" },
  { n: 2, path: "/analyze", label: "Analyze", emoji: "🔍" },
  { n: 3, path: "/sort", label: "Sort", emoji: "🎯" },
  { n: 4, path: "/variants", label: "Approve", emoji: "✅" },
  { n: 5, path: "/variants", label: "Launch", emoji: "🚀" },
] as const

export function PipelineVisualizer() {
  const pathname = usePathname()
  const router = useRouter()
  const analysis = useHookStore((s) => s.analysis)
  const variants = useHookStore((s) => s.variants)
  const approvedSize = useHookStore((s) => s.approved_ids.size)

  // Current active step
  const activeStepN = (() => {
    if (pathname === "/") return 1
    if (pathname === "/analyze") return 2
    if (pathname === "/sort") return 3
    if (pathname === "/variants") {
      // On variants page, step 5 is "active" if user has approved anything
      return approvedSize > 0 ? 5 : 4
    }
    return 1
  })()

  // Which steps are completed (clickable to revisit)
  function isAvailable(n: number): boolean {
    if (n === 1) return true
    if (n === 2) return !!analysis || activeStepN >= 2
    if (n === 3) return !!analysis
    if (n === 4 || n === 5) return variants.length > 0
    return false
  }

  function onClick(path: string, n: number) {
    if (!isAvailable(n)) return
    router.push(path)
  }

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5">
      <div className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        Hook Factory · 5 кроків
      </div>
      <div className="flex items-center gap-1 overflow-x-auto">
        {STEPS.map((s, i) => {
          const active = s.n === activeStepN
          const done = s.n < activeStepN
          const available = isAvailable(s.n)
          return (
            <div key={s.n + s.label} className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => onClick(s.path, s.n)}
                disabled={!available}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors ${
                  active
                    ? "border-primary bg-primary/15 text-foreground"
                    : done
                      ? "border-green-500/40 bg-green-500/10 text-foreground"
                      : available
                        ? "border-muted bg-background text-muted-foreground hover:bg-accent"
                        : "border-muted bg-background text-muted-foreground/40"
                } ${available ? "cursor-pointer" : "cursor-not-allowed"}`}
                title={available ? `Перейти до Step ${s.n}: ${s.label}` : ""}
              >
                <span aria-hidden className="text-sm">
                  {done ? "✓" : s.emoji}
                </span>
                <div className="flex flex-col items-start">
                  <span className="text-[9px] font-bold tracking-widest uppercase">
                    Step {s.n}
                  </span>
                  <span className="text-[11px] leading-tight font-semibold">
                    {s.label}
                  </span>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <span className="px-0.5 text-muted-foreground/40" aria-hidden>
                  →
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
