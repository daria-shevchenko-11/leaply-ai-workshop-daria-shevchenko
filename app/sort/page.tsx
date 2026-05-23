"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useHookStore } from "@/lib/stores/hook-store"
import type { VariationAxis } from "@/lib/schemas/hook-schemas"
import { DemoModeToggle } from "@/components/demo-mode-toggle"
import { PipelineVisualizer } from "@/components/pipeline-visualizer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"

type AxisOption = {
  id: VariationAxis
  emoji: string
  label: string
  desc: string
}

const AXES: AxisOption[] = [
  {
    id: "text",
    emoji: "📝",
    label: "Текст / месседж",
    desc: "Змінити слова, зберегти структуру",
  },
  {
    id: "audience",
    emoji: "👥",
    label: "Аудиторія",
    desc: "Різні болі / вікові групи",
  },
  {
    id: "tone",
    emoji: "🎭",
    label: "Тон",
    desc: "Authoritative / native / friendly",
  },
  {
    id: "character",
    emoji: "👤",
    label: "Персонаж",
    desc: "Стать, вік, архетип актора",
  },
  {
    id: "pain",
    emoji: "💥",
    label: "Pain angle",
    desc: "Новий тригер, той самий месседж",
  },
  {
    id: "format",
    emoji: "🎬",
    label: "Visual Format",
    desc: "UGC ↔ Authority ↔ Text-Centric...",
  },
  {
    id: "frankenstein",
    emoji: "🧩",
    label: "Frankenstein",
    desc: "Mix-and-match різних winning formats",
  },
]

export default function SortPage() {
  const router = useRouter()
  const brief = useHookStore((s) => s.brief)
  const analysis = useHookStore((s) => s.analysis)
  const variationAxes = useHookStore((s) => s.variation_axes)
  const toggleAxis = useHookStore((s) => s.toggleAxis)
  const axisCounts = useHookStore((s) => s.axis_counts)
  const setAxisCount = useHookStore((s) => s.setAxisCount)
  const setBrief = useHookStore((s) => s.setBrief)
  const goToStep = useHookStore((s) => s.goToStep)
  const setVariants = useHookStore((s) => s.setVariants)

  useEffect(() => {
    if (!brief || !analysis) {
      router.replace("/")
    }
  }, [brief, analysis, router])

  if (!brief || !analysis) return null

  // Total = sum across selected axes
  const totalCount = variationAxes.reduce(
    (acc, a) => acc + (axisCounts[a] ?? 0),
    0
  )

  function onContinue() {
    if (variationAxes.length === 0 || totalCount === 0) return
    setVariants([])
    // Sync brief.variant_count = totalCount so generation uses the sum
    setBrief({ ...brief!, variant_count: Math.min(totalCount, 10) })
    goToStep("variants")
    router.push("/variants")
  }

  const estimatedCost = (totalCount * 1.05).toFixed(2)
  const metaOk = totalCount >= 5

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-4 space-y-1">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Step 3 of 5 · Sort
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Що варіюємо? + скільки на кожній осі
          </h1>
        </header>

        <div className="mb-4">
          <PipelineVisualizer />
        </div>

        <div className="mb-6">
          <DemoModeToggle />
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* Per-axis cards: each has checkbox toggle + slider inside */}
            <div className="space-y-3">
              {AXES.map((a) => {
                const on = variationAxes.includes(a.id)
                const count = axisCounts[a.id] ?? 0
                return (
                  <div
                    key={a.id}
                    className={`rounded-md border-2 transition-colors ${
                      on
                        ? "border-primary bg-primary/5"
                        : "border-muted bg-muted/30"
                    }`}
                  >
                    {/* Header row — clickable to toggle */}
                    <button
                      type="button"
                      onClick={() => toggleAxis(a.id)}
                      className="flex w-full items-start gap-3 p-3 text-left"
                    >
                      <span className="text-xl">{a.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">
                            {a.label}
                          </span>
                          {on ? (
                            <Badge variant="secondary">{count} variants</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              + додати
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {a.desc}
                        </p>
                      </div>
                    </button>
                    {/* Slider — only shown when axis is on */}
                    {on && (
                      <div className="space-y-1.5 border-t border-primary/20 px-3 py-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Скільки варіантів на цій осі?
                          </span>
                          <span className="font-bold">{count}</span>
                        </div>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[count]}
                          onValueChange={(v) => setAxisCount(a.id, v[0])}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Total summary */}
            <div className="space-y-2 rounded-md border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Всього варіантів</span>
                <Badge variant="default" className="text-base">
                  {totalCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">1 мін</span>
                <span
                  className={
                    metaOk
                      ? "text-green-600 dark:text-green-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  }
                >
                  {metaOk
                    ? "✓ Meta rule: ≥5 different per batch"
                    : "⚠ Meta recommends ≥5"}
                </span>
                <span className="text-muted-foreground">10 макс</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Орієнтовна вартість: ~${estimatedCost} (Gemini + Kling)
              </p>
              {totalCount > 10 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠ Понад 10 — згенеруємо перші 10 (Gemini ліміт за один
                  прогін).
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => router.push("/analyze")}
                className="sm:w-auto"
              >
                ← Назад
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={variationAxes.length === 0 || totalCount === 0}
                onClick={onContinue}
              >
                Генерувати {Math.min(totalCount, 10)} варіантів →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
