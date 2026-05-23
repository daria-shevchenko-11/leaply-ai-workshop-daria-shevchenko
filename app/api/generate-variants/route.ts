import { NextResponse } from "next/server"
import {
  GenerateVariantsRequestSchema,
  type VariantsResult,
  type AnalysisResult,
  type Variant,
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
    // Build per-variant prompt with analysis context (actor/visual_summary baseline)
    const variantsWithCovers = await Promise.all(
      textResult.variants.map(async (v) => {
        const coverPrompt = buildCoverPrompt(v, analysis)
        const coverUrl = await generateCoverImage(coverPrompt, apiKeyOverride)
        return {
          ...v,
          cover_image_url: coverUrl,
          // Stash the prompt on the variant so UI can show a debug tooltip.
          // (Variant schema permits extra fields via passthrough? — if not,
          // we attach it as a sibling. For simplicity carry through ae_brief
          // appended; UI shows the prompt via separate state.)
        }
      })
    )

    const result: VariantsResult = { variants: variantsWithCovers }
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Per-visual-format style hints — used to anchor the AI to the right
// composition / lighting / energy for each Leaply Visual Format.
const VF_STYLE_HINTS: Record<string, string> = {
  "professional-authority":
    "Mid-shot, clinical or office setting, subject in white coat / scrubs / blazer, soft directional window light from camera-left, neutral beige and cool-grey tones, direct camera gaze with subtle authoritative gravitas, slight lean-in moment.",
  "native-ugc":
    "Vertical handheld framing, natural daylight through bedroom or kitchen window, slightly imperfect framing, candid documentary feel, authentic morning-warmth, no studio lighting, real-person energy, mid-shot from chest up.",
  "social-interaction":
    "Two people in a mid-conversation moment, one leaning toward the other to give advice / share secret, soft indoor afternoon light, slight handheld camera shake, candid intimate energy, both faces visible.",
  "visual-evidence":
    "Split-screen before/after composition with clear vertical seam, left side dim-lit / slumped posture / tired expression, right side bright-lit / upright / softly smiling, hopeful transformative mood, identical framing both halves.",
  "action-lifestyle":
    "Subject mid-activity (walking briskly, sitting at desk, picking up child, opening cabinet), environmental context fully visible, dynamic but grounded composition, motion blur in extremities, real apartment / office / street backdrop.",
  "text-centric":
    "Single dominant subject framed top-left or bottom-right, simple uncluttered single-tone background, generous negative space in opposite quadrant for designer typography overlay (DO NOT render any text in the image itself), high contrast.",
  other:
    "Photorealistic editorial portrait, soft natural lighting from window-left, dignified composition with subject centered, hybrid / experimental visual approach.",
}

function buildCoverPrompt(v: Variant, analysis: AnalysisResult): string {
  const decomp = analysis.decomposition
  const isUgc =
    v.tags.visual_format_id === "native-ugc" ||
    v.tags.visual_format_id === "social-interaction"

  const styleLine =
    VF_STYLE_HINTS[v.tags.visual_format_id] ?? VF_STYLE_HINTS["other"]

  const parts: string[] = [
    // Hard-rule trailer at top so it dominates the prompt
    "Vertical 9:16 framing, photorealistic, social-media native style, sharp focus, 1080x1920 resolution.",
    `Visual format target: ${styleLine}`,
    // Anchor character to analysis.decomposition.actor when available
    // (so AI doesn't drift each variant to a different person)
    decomp.actor
      ? `Subject base (anchor — keep consistent demographics across variants of same Core Message): ${decomp.actor}.`
      : "",
    // Per-variant tweak — Daria's ae_brief
    `Variant-specific direction: ${v.ae_brief}`,
    // Pain point informs facial expression / setting cues but NOT text overlay
    `Pain angle reference (informs setting / expression — do NOT render as on-screen text): ${v.tags.pain_point_id}.`,
    `Hook approach (informs facial expression / pacing / energy): ${v.tags.hook_type_id}.`,
    // Static state rule (Nano Banana as first-frame of motion)
    "Capture a STATIC state — the moment just before any motion (subject standing still, ready to speak / move). Avoid mid-action blur.",
    // Hard rules trailer — repeated for emphasis
    "Do NOT render any text, captions, subtitles, watermarks, logos, brand marks, UI elements, phone screens with content, or paper signs in the image.",
  ]
  if (isUgc) {
    parts.push(
      "UGC authenticity: handheld camera angle, slight imperfect framing, natural unpolished lighting, candid documentary feel, real-person energy. CRITICAL: Do NOT include any phone, smartphone, screen, tablet, or device in the frame anywhere."
    )
  }
  // Variant id at very end — invisible to Gemini's actual interpretation but
  // makes prompt fingerprint unique so picsum fallback gives unique seeds.
  parts.push(`[variant ${v.id}]`)
  return parts.filter(Boolean).join("\n\n")
}
