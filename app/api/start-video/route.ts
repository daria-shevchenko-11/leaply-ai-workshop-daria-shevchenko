import { NextResponse } from "next/server"
import { StartVideoRequestSchema } from "@/lib/schemas/hook-schemas"
import { submitVeoVideo } from "@/lib/gemini"
import { submitKlingPrediction } from "@/lib/replicate"
import { submitKlingDirect } from "@/lib/kling-direct"
import { env } from "@/lib/env"

export const runtime = "nodejs"
export const maxDuration = 30

// Job IDs are prefixed with provider tag so video-status can route the poll.
// Format: "replicate:<id>" or "veo:<operation-name>"

export async function POST(req: Request) {
  try {
    // Header-based token overrides (same pattern as Gemini key)
    const replicateTokenOverride =
      req.headers.get("x-replicate-token") || undefined
    const klingAkOverride = req.headers.get("x-kling-access-key") || undefined
    const klingSkOverride = req.headers.get("x-kling-secret-key") || undefined

    const body = await req.json()
    const { variant } = StartVideoRequestSchema.parse(body)
    const prompt = buildVideoPrompt(variant)

    // Provider priority:
    //   1. Official Kling direct API (AK + SK) — best quality, no proxy
    //   2. Replicate-hosted Kling — easy fallback
    //   3. Veo via Gemini — workshop-key compatible last resort
    const klingAk = klingAkOverride || env.KLING_ACCESS_KEY
    const klingSk = klingSkOverride || env.KLING_SECRET_KEY
    if (klingAk && klingSk) {
      const taskId = await submitKlingDirect(klingAk, klingSk, {
        prompt,
        ...(variant.cover_image_url &&
        !variant.cover_image_url.startsWith("data:")
          ? { image_url: variant.cover_image_url }
          : {}),
        duration: 5,
        aspect_ratio: "9:16",
      })
      return NextResponse.json({ job_id: `kling-direct:${taskId}` })
    }

    const replicateToken = replicateTokenOverride || env.REPLICATE_API_TOKEN
    if (replicateToken) {
      const predictionId = await submitKlingPrediction(replicateToken, {
        prompt,
        ...(variant.cover_image_url &&
        !variant.cover_image_url.startsWith("data:")
          ? { start_image: variant.cover_image_url }
          : {}),
        duration: 5,
        aspect_ratio: "9:16",
      })
      return NextResponse.json({ job_id: `replicate:${predictionId}` })
    }

    const operationName = await submitVeoVideo(prompt)
    return NextResponse.json({ job_id: `veo:${operationName}` })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function buildVideoPrompt(variant: {
  hook_text: string
  ae_brief: string
  tags: { visual_format_id: string }
}): string {
  return `${variant.ae_brief}

On-screen text overlay (animate in over first 1.5 sec): "${variant.hook_text}"

Format: 9:16 vertical, 8 seconds, photorealistic, social-media native style. Visual format tag: ${variant.tags.visual_format_id}. Sound design subtle and supportive. No watermarks, no logos.`
}
