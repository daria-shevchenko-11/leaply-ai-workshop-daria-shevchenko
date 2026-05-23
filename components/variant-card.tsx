"use client"

import { useHookStore } from "@/lib/stores/hook-store"
import type { Variant } from "@/lib/schemas/hook-schemas"
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

type Props = { variant: Variant }

export function VariantCard({ variant }: Props) {
  const approved = useHookStore((s) => s.isApproved(variant.id))
  const toggleApproved = useHookStore((s) => s.toggleApproved)
  const updateText = useHookStore((s) => s.updateVariantText)
  const videoJob = useHookStore((s) => s.video_jobs[variant.id])
  const demoMode = useHookStore((s) => s.demo_mode)

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

        {/* AE brief (collapsed) */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">
            AE / Video brief
          </summary>
          <p className="mt-1.5 whitespace-pre-wrap">{variant.ae_brief}</p>
        </details>

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
