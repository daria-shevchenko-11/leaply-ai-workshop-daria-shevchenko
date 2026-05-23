"use client"

// Direct Kling Direct API test page. Bypasses Gemini entirely.
// Use this to verify your Kling AK + SK actually work without Gemini being
// the blocker. Submits a single text-to-video (or image-to-video) request,
// polls until done, plays the result.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useHookStore } from "@/lib/stores/hook-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { VideoStatusResponseSchema } from "@/lib/schemas/hook-schemas"

const SAMPLE_PROMPT = `A 45-year-old woman (the doctor in a crisp white medical coat with shoulder-length brown hair) stands in a softly-lit clinic corridor, leans slightly toward the camera, and speaks with calm clinical authority, mid-low register, deliberate pacing: "Your lymph nodes are blocked, and you do not feel it yet." Camera holds in a static medium close-up with very subtle handheld stability. Ambience: muffled corridor footsteps, soft medical equipment beeps in distance, no background music. Duration: 5 seconds.`

export default function KlingTestPage() {
  const klingAk = useHookStore((s) => s.kling_access_key)
  const klingSk = useHookStore((s) => s.kling_secret_key)
  const setKlingAk = useHookStore((s) => s.setKlingAccessKey)
  const setKlingSk = useHookStore((s) => s.setKlingSecretKey)

  const [prompt, setPrompt] = useState(SAMPLE_PROMPT)
  const [imageUrl, setImageUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<
    "idle" | "submitted" | "processing" | "completed" | "failed"
  >("idle")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollLog, setPollLog] = useState<string[]>([])

  const haveKeys = !!(klingAk && klingSk)

  async function onSubmit() {
    setError(null)
    setVideoUrl(null)
    setJobId(null)
    setPollLog([])
    setStatus("idle")

    if (!haveKeys) {
      setError("Спочатку вкажи обидва Kling-ключі (AK + SK).")
      return
    }
    if (!prompt.trim()) {
      setError("Опиши що рендерити (Kling video prompt).")
      return
    }
    setSubmitting(true)
    try {
      // Use the existing /api/start-video route with a minimal Variant shape
      // that triggers Kling-direct path (keys via headers).
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-kling-access-key": klingAk,
        "x-kling-secret-key": klingSk,
      }
      const fakeVariant = {
        id: "test-" + Date.now(),
        hook_text: prompt,
        cover_image_url: imageUrl.trim() || "",
        video_url: null,
        video_job_id: null,
        tags: {
          core_message_id: "",
          visual_format_id: "",
          pain_point_id: "",
          hook_type_id: "",
        },
        ae_brief: prompt,
        is_frankenstein: false,
      }
      const res = await fetch("/api/start-video", {
        method: "POST",
        headers,
        body: JSON.stringify({ variant: fakeVariant }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`)
      }
      const json = (await res.json()) as { job_id?: string; error?: string }
      if (!json.job_id) {
        throw new Error(json.error ?? "No job_id returned")
      }
      setJobId(json.job_id)
      setStatus("submitted")
      setPollLog((p) => [...p, `submit ✓ job_id=${json.job_id}`])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed")
    } finally {
      setSubmitting(false)
    }
  }

  // Polling
  useEffect(() => {
    if (!jobId || status === "completed" || status === "failed") return
    let cancelled = false
    const headers: Record<string, string> = {
      "x-kling-access-key": klingAk,
      "x-kling-secret-key": klingSk,
    }

    async function tick() {
      if (cancelled) return
      try {
        const res = await fetch(
          `/api/video-status/${encodeURIComponent(jobId!)}`,
          { headers }
        )
        const json = (await res.json()) as unknown
        const parsed = VideoStatusResponseSchema.parse(json)
        const ts = new Date().toLocaleTimeString()
        setPollLog((p) => [
          ...p,
          `${ts} → status=${parsed.status} ${parsed.video_url ? "(url ready)" : ""}${parsed.error ? " err=" + parsed.error : ""}`,
        ])
        if (parsed.status === "completed") {
          setVideoUrl(parsed.video_url)
          setStatus("completed")
          return
        }
        if (parsed.status === "failed") {
          setError(parsed.error ?? "Kling failed")
          setStatus("failed")
          return
        }
        setStatus("processing")
      } catch (e) {
        // keep polling unless catastrophic
        setPollLog((p) => [
          ...p,
          `poll error: ${e instanceof Error ? e.message : "unknown"}`,
        ])
      }
    }

    // First poll after 5 sec, then every 8 sec
    const first = setTimeout(tick, 5000)
    const interval = setInterval(tick, 8000)
    return () => {
      cancelled = true
      clearTimeout(first)
      clearInterval(interval)
    }
  }, [jobId, status, klingAk, klingSk])

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Nav */}
        <nav className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-md border border-muted bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            🎣 Hook Factory
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            href="/production-sheet"
            className="rounded-md border border-muted bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            🎬 Production Sheet
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium">
            🧪 Kling Test
          </span>
        </nav>

        <header className="mb-6 space-y-1">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Direct API test · bypass Gemini
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            🧪 Kling Direct API Test
          </h1>
          <p className="text-sm text-muted-foreground">
            Прямий тест Kling API без Gemini. Перевір що AK + SK взагалі
            аутентифікуються і Kuaishou приймає запит.
          </p>
        </header>

        {/* Keys panel */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              🔑 Kling keys
              {haveKeys ? (
                <Badge
                  variant="default"
                  className="border-green-500 bg-green-500/15 text-green-700 dark:text-green-300"
                >
                  ✓ обидва є
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-700 dark:text-yellow-300"
                >
                  ⚠ не вистачає
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Access Key (AK)</label>
              <Input
                type="password"
                placeholder="AN8ATDy..."
                value={klingAk}
                onChange={(e) => setKlingAk(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Secret Key (SK)</label>
              <Input
                type="password"
                placeholder="ktKpPp..."
                value={klingSk}
                onChange={(e) => setKlingSk(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {!jobId && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Kling video prompt
                </label>
                <Textarea
                  rows={8}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Sample вище — заміни на свій або залиш для першого тесту.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Image URL (опціонально — для image-to-video)
                </label>
                <Input
                  type="url"
                  placeholder="https://... (первий кадр; можна лишити порожнім — буде text-to-video)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Має бути публічна URL (не data:base64). Якщо порожнє — Kling
                  згенерує суто з тексту.
                </p>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={onSubmit}
                disabled={submitting || !haveKeys || !prompt.trim()}
              >
                {submitting ? "⏳ Submitting..." : "🚀 Submit to Kling"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status + result */}
        {jobId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Status: <StatusBadge status={status} />
              </CardTitle>
              <p className="font-mono text-[10px] break-all text-muted-foreground">
                job_id: {jobId}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {status === "completed" && videoUrl && (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full rounded-md border"
                />
              )}
              {status === "failed" && error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  ❌ {error}
                </div>
              )}
              {(status === "submitted" || status === "processing") && (
                <p className="text-sm text-muted-foreground">
                  ⏳ Kling рендерить (~2-5 хв)... Polling кожні 8 сек.
                </p>
              )}

              {/* Poll log — for debugging */}
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">
                  Debug poll log ({pollLog.length} entries)
                </summary>
                <pre className="mt-2 max-h-48 overflow-y-auto rounded bg-muted/40 p-2 font-mono text-[10px]">
                  {pollLog.join("\n")}
                </pre>
              </details>

              <Button
                variant="outline"
                onClick={() => {
                  setJobId(null)
                  setVideoUrl(null)
                  setStatus("idle")
                  setError(null)
                  setPollLog([])
                }}
              >
                ← Новий тест
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-muted text-muted-foreground",
    submitted:
      "border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-300",
    processing:
      "border-yellow-500 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
    completed:
      "border-green-500 bg-green-500/15 text-green-700 dark:text-green-300",
    failed: "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300",
  }
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.idle}`}
    >
      {status}
    </span>
  )
}
