"use client"

import { useHookStore } from "@/lib/stores/hook-store"

export function DemoModeToggle() {
  const demo = useHookStore((s) => s.demo_mode)
  const setDemo = useHookStore((s) => s.setDemoMode)
  const setAnalysis = useHookStore((s) => s.setAnalysis)
  const setVariants = useHookStore((s) => s.setVariants)

  function onToggle() {
    // Clear stale analysis + variants when mode changes
    setAnalysis(null)
    setVariants([])
    setDemo(!demo)
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md border px-4 py-2 text-sm transition-colors ${
        demo
          ? "border-yellow-500 bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100"
          : "border-muted bg-muted/40 text-muted-foreground"
      }`}
    >
      <div>
        <span className="font-medium">Demo Mode {demo ? "ON" : "OFF"}</span>
        <span className="ml-2 hidden sm:inline">
          {demo
            ? "— using mock data, no API calls"
            : "— real Gemini + Kling calls"}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
          demo
            ? "border-yellow-700 bg-yellow-200 hover:bg-yellow-300 dark:border-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700"
            : "border-foreground/20 bg-background hover:bg-accent"
        }`}
      >
        {demo ? "Turn OFF" : "Turn ON"}
      </button>
    </div>
  )
}
