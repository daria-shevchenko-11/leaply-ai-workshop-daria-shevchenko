"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useHookStore } from "@/lib/stores/hook-store"
import { AnalysisResultSchema } from "@/lib/schemas/hook-schemas"
import { findLinkedTasks } from "@/lib/fit-check"
import { AnalysisCard } from "@/components/analysis-card"
import { DemoModeToggle } from "@/components/demo-mode-toggle"
import { PipelineVisualizer } from "@/components/pipeline-visualizer"
import { ProgressStream } from "@/components/progress-stream"
import { Button } from "@/components/ui/button"
import mockAnalysisJson from "@/lib/data/mock-analysis.json"

export default function AnalyzePage() {
  const router = useRouter()
  const brief = useHookStore((s) => s.brief)
  const demoMode = useHookStore((s) => s.demo_mode)
  const analysis = useHookStore((s) => s.analysis)
  const setAnalysis = useHookStore((s) => s.setAnalysis)
  const setGenerationMode = useHookStore((s) => s.setGenerationMode)
  const goToStep = useHookStore((s) => s.goToStep)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressStep, setProgressStep] = useState(0)

  useEffect(() => {
    if (!brief) {
      router.replace("/")
      return
    }
    // If we already have an analysis (back-navigation), skip
    if (analysis) return

    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        if (demoMode) {
          // Demo Mode: simulate 4 progress steps over ~2 seconds
          for (let i = 1; i <= 4; i++) {
            if (cancelled) return
            await new Promise((r) => setTimeout(r, 500))
            setProgressStep(i)
          }
          const parsed = AnalysisResultSchema.parse(mockAnalysisJson as unknown)
          if (!cancelled) setAnalysis(parsed)
        } else {
          setProgressStep(1)
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(brief),
          })
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(
              `Analyze failed (${res.status}): ${txt.slice(0, 200)}`
            )
          }
          setProgressStep(4)
          const json = (await res.json()) as unknown
          const parsed = AnalysisResultSchema.parse(json)
          // Recompute linked tasks locally if mapping exists (server may not include all)
          if (parsed.fit_check.mapped) {
            parsed.linked_tasks = findLinkedTasks(parsed.fit_check.mapped)
          }
          if (!cancelled) setAnalysis(parsed)
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "Невідома помилка. Спробуй Demo Mode."
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [brief, demoMode, analysis, router, setAnalysis])

  if (!brief) return null

  const progressMessages: {
    label: string
    status: "pending" | "active" | "done" | "failed"
  }[] = [
    { label: "Transcribing audio", status: stepStatus(progressStep, 1) },
    { label: "Reading visuals", status: stepStatus(progressStep, 2) },
    {
      label: "Matching against Leaply taxonomy",
      status: stepStatus(progressStep, 3),
    },
    { label: "Finding linked tasks", status: stepStatus(progressStep, 4) },
  ]
  const overall = (progressStep / 4) * 100

  function onContinue(mode: "apply_existing_cm" | "propose_new_cm") {
    setGenerationMode(mode)
    goToStep("sort")
    router.push("/sort")
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-4 space-y-1">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Step 2 of 5 · Collect
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Що AI знайшов у хуку
          </h1>
        </header>

        <div className="mb-4">
          <PipelineVisualizer />
        </div>

        <div className="mb-6">
          <DemoModeToggle />
        </div>

        {loading && (
          <ProgressStream messages={progressMessages} overall={overall} />
        )}

        {error && !loading && (
          <div className="space-y-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-destructive">Помилка аналізу:</p>
            <p className="text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">
              Спробуй увімкнути Demo Mode зверху і клікнути «Назад».
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/")}
            >
              ← Назад
            </Button>
          </div>
        )}

        {!loading && !error && analysis && (
          <>
            <AnalysisCard />
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="sm:w-auto"
              >
                ← Назад
              </Button>
              {analysis.fit_check.status === "existing" ? (
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={() => onContinue("apply_existing_cm")}
                >
                  Обрати варіації (existing CM) →
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={() => onContinue("propose_new_cm")}
                >
                  Обрати варіації (new CM) →
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function stepStatus(
  progress: number,
  step: number
): "pending" | "active" | "done" | "failed" {
  if (progress > step) return "done"
  if (progress === step) return "active"
  return "pending"
}
