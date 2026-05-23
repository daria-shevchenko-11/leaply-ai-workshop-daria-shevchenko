"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useHookStore } from "@/lib/stores/hook-store"
import {
  VariantsResultSchema,
  VideoStatusResponseSchema,
} from "@/lib/schemas/hook-schemas"
import { VariantCard } from "@/components/variant-card"
import { DemoModeToggle } from "@/components/demo-mode-toggle"
import { PipelineVisualizer } from "@/components/pipeline-visualizer"
import { ProgressStream } from "@/components/progress-stream"
import { Button } from "@/components/ui/button"
import mockVariantsJson from "@/lib/data/mock-variants.json"
import { buildApprovedZip, downloadBlob } from "@/lib/export-zip"
import { downloadAEScript } from "@/lib/ae-script"

export default function VariantsPage() {
  const router = useRouter()
  const brief = useHookStore((s) => s.brief)
  const analysis = useHookStore((s) => s.analysis)
  const generationMode = useHookStore((s) => s.generation_mode)
  const variationAxes = useHookStore((s) => s.variation_axes)
  const demoMode = useHookStore((s) => s.demo_mode)
  const geminiKey = useHookStore((s) => s.gemini_api_key)
  const variants = useHookStore((s) => s.variants)
  const setVariants = useHookStore((s) => s.setVariants)
  const approvedIds = useHookStore((s) => s.approved_ids)
  const setVideoJob = useHookStore((s) => s.setVideoJob)
  const updateVideoJobStatus = useHookStore((s) => s.updateVideoJobStatus)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressStep, setProgressStep] = useState(0)
  const startedRef = useRef(false)

  // 1. Load variants (mock or real)
  useEffect(() => {
    if (!brief || !analysis) {
      router.replace("/")
      return
    }
    if (variants.length > 0) return
    if (startedRef.current) return
    startedRef.current = true

    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        if (demoMode) {
          for (let i = 1; i <= 3; i++) {
            if (cancelled) return
            await new Promise((r) => setTimeout(r, 600))
            setProgressStep(i)
          }
          const parsed = VariantsResultSchema.parse(mockVariantsJson as unknown)
          if (!cancelled) {
            // Trim to brief.variant_count
            const trimmed = parsed.variants.slice(0, brief!.variant_count)
            setVariants(trimmed)
          }
        } else {
          setProgressStep(1)
          const headers: Record<string, string> = {
            "content-type": "application/json",
          }
          if (geminiKey) headers["x-google-ai-key"] = geminiKey
          const res = await fetch("/api/generate-variants", {
            method: "POST",
            headers,
            body: JSON.stringify({
              brief,
              analysis,
              generation_mode: generationMode,
              variation_axes: variationAxes,
            }),
          })
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(
              `Generate failed (${res.status}): ${txt.slice(0, 200)}`
            )
          }
          setProgressStep(3)
          const json = (await res.json()) as unknown
          const parsed = VariantsResultSchema.parse(json)
          if (!cancelled) setVariants(parsed.variants)
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "Помилка генерації. Спробуй Demo Mode."
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    brief,
    analysis,
    demoMode,
    generationMode,
    variationAxes,
    geminiKey,
    variants.length,
    setVariants,
    router,
  ])

  const pollVideoJob = useCallback(
    async (variantId: string, jobId: string) => {
      const MAX_POLLS = 60 // ~5 min at 5s interval
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, 5000))
        try {
          const res = await fetch(`/api/video-status/${jobId}`)
          if (!res.ok) continue
          const json = (await res.json()) as unknown
          const parsed = VideoStatusResponseSchema.parse(json)
          if (parsed.status === "completed") {
            updateVideoJobStatus(variantId, "completed", parsed.video_url)
            return
          }
          if (parsed.status === "failed") {
            updateVideoJobStatus(variantId, "failed", null, parsed.error)
            return
          }
        } catch {
          // ignore — keep polling
        }
      }
      updateVideoJobStatus(variantId, "failed", null, "Timeout (5 min)")
    },
    [updateVideoJobStatus]
  )

  // 2. Kick off video gen for each variant (real mode only)
  useEffect(() => {
    if (demoMode || variants.length === 0) return
    let cancelled = false

    async function startAll() {
      for (const v of variants) {
        if (cancelled) return
        // Skip if we already have a job for this variant
        const state = useHookStore.getState()
        if (state.video_jobs[v.id]) continue

        setVideoJob(v.id, {
          variant_id: v.id,
          status: "pending",
          video_url: null,
          error: null,
        })

        try {
          const res = await fetch("/api/start-video", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ variant: v }),
          })
          if (!res.ok) {
            const txt = await res.text()
            updateVideoJobStatus(
              v.id,
              "failed",
              null,
              `Submit failed: ${txt.slice(0, 100)}`
            )
            continue
          }
          const { job_id } = (await res.json()) as { job_id: string }
          updateVideoJobStatus(v.id, "processing")
          // Start polling
          void pollVideoJob(v.id, job_id)
        } catch (e) {
          updateVideoJobStatus(
            v.id,
            "failed",
            null,
            e instanceof Error ? e.message : "Submit error"
          )
        }
      }
    }
    startAll()

    return () => {
      cancelled = true
    }
  }, [demoMode, variants, setVideoJob, updateVideoJobStatus, pollVideoJob])

  async function onDownloadZip() {
    if (!brief || !analysis) return
    const approved = variants.filter((v) => approvedIds.has(v.id))
    if (approved.length === 0) return
    try {
      const blob = await buildApprovedZip({
        brief,
        analysis,
        approved_variants: approved,
        generation_mode: generationMode,
      })
      const ts = new Date().toISOString().replace(/[:.]/g, "-")
      downloadBlob(blob, `hook-factory-${ts}.zip`)
    } catch (e) {
      alert(
        `Не вдалося зібрати ZIP: ${e instanceof Error ? e.message : "unknown"}`
      )
    }
  }

  function onDownloadAE() {
    const approved = variants.filter((v) => approvedIds.has(v.id))
    if (approved.length === 0) return
    downloadAEScript(approved)
  }

  const approvedCount = variants.filter((v) => approvedIds.has(v.id)).length

  if (!brief || !analysis) return null

  const progressMessages: {
    label: string
    status: "pending" | "active" | "done" | "failed"
  }[] = [
    {
      label: "Writing text variants",
      status: progressStepStatus(progressStep, 1),
    },
    {
      label: "Generating cover images (Nano Banana 2)",
      status: progressStepStatus(progressStep, 2),
    },
    {
      label: "Submitting video jobs",
      status: progressStepStatus(progressStep, 3),
    },
  ]
  const overall = (progressStep / 3) * 100

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Steps 4–5 of 5 · Approve & Launch
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Варіанти готові — апрувай і експортуй
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={onDownloadAE}
              disabled={approvedCount === 0}
              size="sm"
              title="Download After Effects JSX script"
            >
              🎬 AE Script
            </Button>
            <Button
              onClick={onDownloadZip}
              disabled={approvedCount === 0}
              size="sm"
            >
              📦 ZIP ({approvedCount})
            </Button>
          </div>
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
            <p className="font-medium text-destructive">Помилка:</p>
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/analyze")}
            >
              ← До аналізу
            </Button>
          </div>
        )}

        {!loading && !error && variants.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {variants.map((v) => (
                <VariantCard key={v.id} variant={v} />
              ))}
            </div>
            <div className="mt-6">
              <Button variant="outline" onClick={() => router.push("/analyze")}>
                ← До аналізу
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function progressStepStatus(
  progress: number,
  step: number
): "pending" | "active" | "done" | "failed" {
  if (progress > step) return "done"
  if (progress === step) return "active"
  return "pending"
}
