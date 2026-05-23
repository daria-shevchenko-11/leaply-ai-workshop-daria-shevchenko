import { NextResponse } from "next/server"
import {
  GenerateVariantsRequestSchema,
  type VariantsResult,
} from "@/lib/schemas/hook-schemas"
import { generateTextVariants, generateCoverImage } from "@/lib/gemini"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const apiKeyOverride = req.headers.get("x-google-ai-key") || undefined
    const body = await req.json()
    const { brief, analysis, generation_mode, variation_axes } =
      GenerateVariantsRequestSchema.parse(body)

    // 1. Generate text variants
    const textResult = await generateTextVariants(
      brief,
      analysis,
      generation_mode,
      variation_axes,
      apiKeyOverride
    )

    // 2. For each variant, generate a cover image in parallel
    const variantsWithCovers = await Promise.all(
      textResult.variants.map(async (v) => {
        const coverPrompt = buildCoverPrompt(v)
        const coverUrl = await generateCoverImage(coverPrompt, apiKeyOverride)
        return { ...v, cover_image_url: coverUrl }
      })
    )

    const result: VariantsResult = { variants: variantsWithCovers }
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function buildCoverPrompt(v: {
  id: string
  hook_text: string
  ae_brief: string
  tags: {
    core_message_id: string
    visual_format_id: string
    pain_point_id: string
    hook_type_id: string
  }
}): string {
  // UGC trap: avoid the word "phone" in UGC/raw-ugc/native formats
  const isUgc =
    v.tags.visual_format_id === "native-ugc" ||
    v.tags.visual_format_id === "social-interaction"

  const styleHints: Record<string, string> = {
    "professional-authority":
      "Mid-shot, clinical setting, subject in white coat, soft directional window light, neutral beige tones, direct camera gaze, authoritative gravitas.",
    "native-ugc":
      "Vertical handheld framing, natural daylight from window, slightly imperfect framing, candid documentary feel, authentic warmth, no studio lighting.",
    "social-interaction":
      "Two people mid-conversation, one teaching/advising the other, soft indoor lighting, slight camera shake, candid moment.",
    "visual-evidence":
      "Split-screen before/after composition, clear contrast in posture/expression between halves, hopeful transformative mood.",
    "action-lifestyle":
      "Subject mid-activity (walking, sitting at desk, daily life), environmental context visible, dynamic but grounded composition.",
    "text-centric":
      "Single dominant subject, simple uncluttered background, lots of negative space for typography overlay (do not render the text).",
    "longread-story":
      "Cinematic intimate framing, soft cinematic color grade, slight shallow depth-of-field, story-opening mood.",
    other:
      "Photorealistic editorial portrait, soft natural lighting, dignified composition.",
  }

  const styleLine = styleHints[v.tags.visual_format_id] ?? styleHints["other"]

  const parts: string[] = [
    "Vertical 9:16 framing, photorealistic, social-media native style, sharp focus.",
    `Visual concept: ${styleLine}`,
    `Subject context: ${v.ae_brief}`,
    `Pain angle reference (do not render as text): ${v.tags.pain_point_id}`,
    `Hook approach (informs facial expression / energy): ${v.tags.hook_type_id}`,
    // Per Daria's rules: no text, no overlays — those happen in editor
    "End: no text on screen, no captions, no watermarks, no logos, no UI elements.",
  ]
  if (isUgc) {
    parts.push(
      "Authenticity: handheld camera, natural lighting, candid documentary feel, real-person energy. Do NOT include any phone or screen in the frame."
    )
  }
  // Variant id helps Gemini differentiate (and creates a unique-prompt-fingerprint
  // so the picsum fallback gives different seeds)
  parts.push(`[variant ${v.id}]`)
  return parts.join("\n\n")
}
