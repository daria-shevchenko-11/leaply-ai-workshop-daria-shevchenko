"use client"

import { useHookStore } from "@/lib/stores/hook-store"

export function ViewToggle() {
  const mode = useHookStore((s) => s.view_mode)
  const setMode = useHookStore((s) => s.setViewMode)

  return (
    <div className="flex gap-0 overflow-hidden rounded-md border bg-muted/30 text-xs">
      <button
        type="button"
        onClick={() => setMode("marketer")}
        className={`flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors ${
          mode === "marketer"
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted"
        }`}
      >
        <span aria-hidden>📣</span> Marketer
      </button>
      <button
        type="button"
        onClick={() => setMode("designer")}
        className={`flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors ${
          mode === "designer"
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted"
        }`}
      >
        <span aria-hidden>🎨</span> Designer
      </button>
    </div>
  )
}
