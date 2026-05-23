"use client"

import { useState } from "react"
import { useHookStore } from "@/lib/stores/hook-store"
import type { Variant, KlingPrompts } from "@/lib/schemas/hook-schemas"
import { KlingPromptsResponseSchema } from "@/lib/schemas/hook-schemas"
import {
  findCoreMessage,
  findVisualFormat,
  findPainPoint,
  findHookType,
} from "@/lib/fit-check"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/copy-button"

type Props = { variant: Variant }

export function VariantCard({ variant }: Props) {
  const approved = useHookStore((s) => s.isApproved(variant.id))
  const toggleApproved = useHookStore((s) => s.toggleApproved)
  const updateText = useHookStore((s) => s.updateVariantText)
  const videoJob = useHookStore((s) => s.video_jobs[variant.id])
  const demoMode = useHookStore((s) => s.demo_mode)
  const analysis = useHookStore((s) => s.analysis)
  const geminiKey = useHookStore((s) => s.gemini_api_key)
  const klingPrompts = useHookStore((s) => s.kling_prompts[variant.id])
  const setKlingPrompts = useHookStore((s) => s.setKlingPrompts)
  const viewMode = useHookStore((s) => s.view_mode)

  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [promptsError, setPromptsError] = useState<string | null>(null)
  const [promptsOpen, setPromptsOpen] = useState(false)

  async function loadKlingPrompts() {
    if (klingPrompts || !analysis) return
    setLoadingPrompts(true)
    setPromptsError(null)
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      }
      if (geminiKey) headers["x-google-ai-key"] = geminiKey
      const res = await fetch("/api/kling-prompts", {
        method: "POST",
        headers,
        body: JSON.stringify({ variant, analysis }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 150)}`)
      }
      const json = (await res.json()) as unknown
      const parsed = KlingPromptsResponseSchema.parse(json)
      setKlingPrompts(variant.id, parsed.prompts)
    } catch (e) {
      setPromptsError(e instanceof Error ? e.message : "Generation failed")
    } finally {
      setLoadingPrompts(false)
    }
  }

  function loadDemoPrompts() {
    // Demo Mode — give a static example so the UI is exercisable without API
    const demo: KlingPrompts = {
      image_prompt: `Vertical 9:16 framing, photorealistic, social-media native style, sharp focus. Anna (a 45-year-old woman with shoulder-length brown hair, soft natural makeup, wearing a crisp white medical coat over a pastel blue blouse) stands in a softly-lit clinic corridor, holding a small tablet at her side. Mid-shot from chest up. Soft directional window light from camera-left. The cup of warm tea on a stainless counter beside her stands perfectly still. No text, no captions, no watermarks, no logos, no UI elements, no on-screen overlays.`,
      video_prompt: `Anna (the 45-year-old woman in white medical coat) steps forward half a pace and leans slightly toward the camera, eyes locking with the viewer. She speaks with calm clinical authority, mid-low register, deliberate pacing: "${variant.hook_text
        .replace(/—/g, ",")
        .replace(/\.\.\./g, ",")
        .replace(
          /!/g,
          "."
        )}". Camera holds in a static medium close-up; very subtle handheld stability. Ambience: muffled corridor footsteps, soft medical equipment beeps in distance, no background music. Duration: 8 seconds.`,
      ambience_note:
        "Soft clinical room tone, distant corridor footsteps, subtle equipment beeps. No music.",
      voice_direction:
        "Female, 40-50, US English, calm clinical authority, mid-low register, deliberate pacing, slight lean-in emphasis on key word.",
      needs_split: false,
      split_video_prompt: null,
    }
    setKlingPrompts(variant.id, demo)
  }

  async function onOpenPrompts() {
    setPromptsOpen((v) => !v)
    if (!klingPrompts && !loadingPrompts) {
      if (demoMode) loadDemoPrompts()
      else await loadKlingPrompts()
    }
  }

  const cm = findCoreMessage(variant.tags.core_message_id)
  const vf = findVisualFormat(variant.tags.visual_format_id)
  const pp = findPainPoint(variant.tags.pain_point_id)
  const ht = findHookType(variant.tags.hook_type_id)

  const videoStatus = videoJob?.status ?? "pending"
  const videoUrl = variant.video_url ?? videoJob?.video_url ?? null

  return (
    <Card
      className={`transition-colors ${
        approved ? "border-green-500/60 bg-green-500/5" : ""
      }`}
    >
      <CardContent className="space-y-3 pt-6">
        {/* Cover */}
        <div className="relative aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-md border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={variant.cover_image_url}
            alt="Cover frame"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Hook text — editable */}
        <Textarea
          value={variant.hook_text}
          onChange={(e) => updateText(variant.id, e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {cm && (
            <Badge variant="secondary" title="Core Message">
              🧠 {cm.name}
            </Badge>
          )}
          {vf && (
            <Badge variant="secondary" title="Visual Format">
              🎨 {vf.name}
            </Badge>
          )}
          {pp && (
            <Badge variant="outline" title="Pain Point">
              💢 {pp.name}
            </Badge>
          )}
          {ht && (
            <Badge variant="outline" title="Hook Type">
              🎯 {ht.name}
            </Badge>
          )}
        </div>

        {/* Video player or status */}
        <div className="space-y-1.5">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full rounded-md border"
            />
          ) : demoMode ? (
            <div className="relative aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-md border-2 border-dashed border-yellow-500/60 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={variant.cover_image_url}
                alt="Demo video preview"
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white">
                <span className="text-3xl">▶️</span>
                <span className="text-xs font-medium">DEMO PREVIEW</span>
                <span className="px-2 text-center text-[10px] text-white/80">
                  Real Veo/Kling video here in production
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
              <span aria-hidden>
                {videoStatus === "processing"
                  ? "⏳"
                  : videoStatus === "failed"
                    ? "❌"
                    : "🎥"}
              </span>
              <span>
                {videoStatus === "pending" && "Video pending..."}
                {videoStatus === "processing" &&
                  "Generating video (~2-5 min)..."}
                {videoStatus === "failed" &&
                  (videoJob?.error ?? "Video generation failed")}
                {videoStatus === "completed" &&
                  !videoUrl &&
                  "Video ready but URL missing"}
              </span>
            </div>
          )}
        </div>

        {/* AE brief — collapsed by default, only in Designer view */}
        {viewMode === "designer" && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">
              AE / Video brief
            </summary>
            <p className="mt-1.5 whitespace-pre-wrap">{variant.ae_brief}</p>
          </details>
        )}

        {/* Kling/Nano Banana prompts — Designer view only */}
        {viewMode === "designer" && (
          <div className="space-y-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenPrompts}
              className="w-full"
            >
              {promptsOpen ? "▼" : "▶"} 📋 Kling / Nano Banana prompts
              {klingPrompts && " ✓"}
            </Button>

            {promptsOpen && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-xs">
                {loadingPrompts && (
                  <p className="text-muted-foreground">
                    ⏳ Generating prompts...
                  </p>
                )}
                {promptsError && (
                  <p className="text-destructive">⚠ {promptsError}</p>
                )}
                {klingPrompts && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                          🖼 Nano Banana (image prompt)
                        </span>
                        <CopyButton
                          text={klingPrompts.image_prompt}
                          label="Copy"
                        />
                      </div>
                      <pre className="max-h-40 overflow-y-auto rounded bg-background p-2 font-mono text-[10px] whitespace-pre-wrap">
                        {klingPrompts.image_prompt}
                      </pre>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                          🎬 Kling Omni (video prompt)
                        </span>
                        <CopyButton
                          text={klingPrompts.video_prompt}
                          label="Copy"
                        />
                      </div>
                      <pre className="max-h-40 overflow-y-auto rounded bg-background p-2 font-mono text-[10px] whitespace-pre-wrap">
                        {klingPrompts.video_prompt}
                      </pre>
                    </div>

                    {klingPrompts.needs_split &&
                      klingPrompts.split_video_prompt && (
                        <div className="space-y-1.5 border-t border-yellow-500/30 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold tracking-widest text-yellow-700 uppercase dark:text-yellow-300">
                              ⚠ Split required — Shot 2 of 2
                            </span>
                            <CopyButton
                              text={klingPrompts.split_video_prompt}
                              label="Copy"
                            />
                          </div>
                          <pre className="max-h-40 overflow-y-auto rounded bg-background p-2 font-mono text-[10px] whitespace-pre-wrap">
                            {klingPrompts.split_video_prompt}
                          </pre>
                        </div>
                      )}

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded bg-background p-2">
                        <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                          🔊 Ambience
                        </div>
                        <div className="text-[10px]">
                          {klingPrompts.ambience_note}
                        </div>
                      </div>
                      <div className="rounded bg-background p-2">
                        <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                          🎙 Voice
                        </div>
                        <div className="text-[10px]">
                          {klingPrompts.voice_direction}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Approve */}
        <Button
          type="button"
          variant={approved ? "default" : "outline"}
          className="w-full"
          onClick={() => toggleApproved(variant.id)}
        >
          {approved ? "✅ Approved (click to unapprove)" : "Approve"}
        </Button>
      </CardContent>
    </Card>
  )
}
