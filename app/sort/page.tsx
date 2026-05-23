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
  const setBrief = useHookStore((s) => s.setBrief)
  const goToStep = useHookStore((s) => s.goToStep)
  const setVariants = useHookStore((s) => s.setVariants)

  useEffect(() => {
    if (!brief || !analysis) {
      router.replace("/")
    }
  }, [brief, analysis, router])

  if (!brief || !analysis) return null

  const count = brief.variant_count

  function setCount(n: number) {
    setBrief({ ...brief!, variant_count: n })
  }

  function onContinue() {
    if (variationAxes.length === 0) return
    // Reset variants so /variants regenerates with new axes
    setVariants([])
    goToStep("variants")
    router.push("/variants")
  }

  const estimatedCost = (count * 1.05).toFixed(2)
  const metaOk = count >= 5

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-4 space-y-1">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Step 3 of 5 · Sort
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Що варіюємо?
          </h1>
        </header>

        <div className="mb-4">
          <PipelineVisualizer />
        </div>

        <div className="mb-6">
          <DemoModeToggle />
        </div>

        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Axis grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {AXES.map((a) => {
                const on = variationAxes.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAxis(a.id)}
                    className={`flex flex-col items-start gap-1 rounded-md border-2 p-3 text-left transition-colors ${
                      on
                        ? "border-primary bg-primary/10"
                        : "border-muted bg-muted/30 hover:bg-muted/60"
                    }`}
                  >
                    <span className="text-xl">{a.emoji}</span>
                    <span className="text-sm font-semibold">{a.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.desc}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Count slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Кількість варіантів
                </label>
                <Badge variant="secondary">{count}</Badge>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[count]}
                onValueChange={(v) => setCount(v[0])}
              />
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
                disabled={variationAxes.length === 0}
                onClick={onContinue}
              >
                Генерувати {count} варіантів →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
