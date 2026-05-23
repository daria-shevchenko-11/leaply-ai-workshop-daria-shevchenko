// Server-only wrapper around Google's @google/genai SDK.
// Provides: hook analysis (text + video), text variant generation, image gen
// (Nano Banana 2), and video gen (Veo via Gemini API).
//
// Model IDs are constants — swap if Google changes names.

import "server-only"
import { GoogleGenAI } from "@google/genai"
import { env } from "@/lib/env"
import { formatTaxonomyForPrompt } from "@/lib/fit-check"
import voiceExamples from "@/lib/data/voice-examples.json"
import {
  AnalysisResultSchema,
  VariantsResultSchema,
  type AnalysisResult,
  type Brief,
  type VariantsResult,
} from "@/lib/schemas/hook-schemas"

// ─── Models (swap if Google renames) ─────────────────────────────────────────
const MODEL_TEXT_VISION = "gemini-3.5-flash"
const MODEL_VIDEO = "veo-3.1-preview"

// ─── Client factory ──────────────────────────────────────────────────────────
// Priority: caller-supplied key (from request header) > env var GOOGLE_AI_API_KEY.
// User pastes their workshop key in the app UI; it's sent per-request as
// `x-google-ai-key` header. No key is stored on the server.
function getClient(overrideKey?: string): GoogleGenAI {
  const apiKey = overrideKey || env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error(
      "Gemini API key missing. Paste a workshop key on Step 1 (the «Gemini API Key» field), or set GOOGLE_AI_API_KEY in Vercel env vars."
    )
  }
  return new GoogleGenAI({ apiKey })
}

// ─── Hook analysis ───────────────────────────────────────────────────────────

const ANALYZE_SYSTEM_PROMPT = `You are a senior performance-marketing strategist for Leaply, a lymph-drainage / wellness product. Your job: analyze an ad hook (3-12 sec video or text description) and (a) decompose its elements + infer audience and pains from the video itself, (b) check fit against Leaply's existing Core Message taxonomy.

ALWAYS reply with valid JSON ONLY, matching this exact shape:

{
  "decomposition": {
    "transcript": "what is being said, verbatim",
    "tone": "1-line description of speaking tone",
    "trigger": "primary emotional/cognitive trigger (fear, curiosity, authority, etc.)",
    "actor": "demographic + archetype of speaker",
    "tempo": "pacing description",
    "visual_summary": "what is shown on screen",
    "inferred_audience": "best guess of target audience based on tone + actor + visuals (e.g. 'Sedentary office workers 35-55')",
    "inferred_pains": "best guess of pain points this hook targets (e.g. 'neck stiffness, morning swelling, lymph stagnation')",
    "why_it_works": "2-3 sentences on WHY this hook stops the scroll — what specifically grabs attention"
  },
  "fit_check": {
    "status": "existing" | "new",
    "confidence": 0.0-1.0,
    "mapped": {
      "core_message_id": "must match an id from taxonomy",
      "core_message_name": "must match name from taxonomy",
      "visual_format_id": "must match id from taxonomy",
      "visual_format_name": "name from taxonomy",
      "pain_point_id": "id from taxonomy",
      "pain_point_name": "name from taxonomy",
      "hook_type_id": "id from taxonomy",
      "hook_type_name": "name from taxonomy"
    } OR null if status is "new",
    "proposed_new_cm": {
      "suggested_name": "short, brand-tone Core Message name",
      "closest_existing_id": "id from existing CM list",
      "closest_existing_name": "name of closest CM",
      "reason": "one sentence on what's genuinely new",
      "recommended_visual_format_ids": ["array of ids"]
    } OR null if status is "existing",
    "reasoning": "one-sentence why this fit"
  },
  "linked_tasks": []
}

Rules:
- For all id fields, use ONLY ids that appear in the taxonomy below.
- Default to "existing" status if confidence > 0.7 — be generous about fit.
- Use "new" status ONLY if the hook genuinely introduces a Core Message that has no reasonable match.
- linked_tasks array stays EMPTY — server fills it from snapshot.
- If user provided audience/pains in the brief, RESPECT them but still fill inferred_audience and inferred_pains based purely on the video.
`

export async function analyzeHook(
  brief: Brief,
  apiKeyOverride?: string
): Promise<AnalysisResult> {
  const ai = getClient(apiKeyOverride)
  const taxonomyBlock = formatTaxonomyForPrompt()

  const userParts: {
    text?: string
    inlineData?: { mimeType: string; data: string }
  }[] = []

  const audienceLine = brief.audience
    ? `AUDIENCE (user override): ${brief.audience}`
    : "AUDIENCE: (not provided — infer from video)"
  const painLine = brief.pain_context
    ? `PAIN CONTEXT (user override): ${brief.pain_context}`
    : "PAIN CONTEXT: (not provided — infer from video)"

  if (brief.reference_type === "video" && brief.reference_video_data_url) {
    // Strip the "data:video/mp4;base64," prefix
    const match = brief.reference_video_data_url.match(
      /^data:([^;]+);base64,(.+)$/
    )
    if (match) {
      const [, mimeType, base64] = match
      userParts.push({ inlineData: { mimeType, data: base64 } })
    }
    userParts.push({
      text: `\n\n${audienceLine}\n${painLine}\n\n${taxonomyBlock}\n\nAnalyze this video reference hook and return the JSON.`,
    })
  } else {
    userParts.push({
      text: `REFERENCE HOOK (text description):\n${brief.reference_text}\n\n${audienceLine}\n${painLine}\n\n${taxonomyBlock}\n\nAnalyze and return the JSON.`,
    })
  }

  const response = await ai.models.generateContent({
    model: MODEL_TEXT_VISION,
    contents: [{ role: "user", parts: userParts }],
    config: {
      systemInstruction: ANALYZE_SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  })

  const raw = response.text
  if (!raw) throw new Error("Empty response from Gemini analyze")

  const json = JSON.parse(raw)
  // Server augments linked_tasks separately — keep array empty here
  if (!Array.isArray(json.linked_tasks)) json.linked_tasks = []
  return AnalysisResultSchema.parse(json)
}

// ─── Text variant generation ─────────────────────────────────────────────────

const VARIANTS_SYSTEM_PROMPT = `You are a senior copywriter for Leaply. Your job: generate N hook text variants based on a reference hook + audience + pain context + Leaply taxonomy.

You MUST stay grounded in Leaply's existing Core Messages and Visual Formats taxonomy. Each variant should:
- Be 1-2 sentences, sharp, scroll-stopping
- Map cleanly to one of the existing Core Messages (if mode = "apply_existing_cm") OR introduce a fresh angle (if mode = "propose_new_cm")
- Sound natural, NOT AI-generic; mirror the voice examples below

VOICE EXAMPLES (mirror this tone):
${voiceExamples.kling_prompt_style.map((v, i) => `${i + 1}. ${v.kling_prompt}`).join("\n\n")}

ALWAYS reply with valid JSON ONLY:

{
  "variants": [
    {
      "id": "v1" (use v1, v2, v3...),
      "hook_text": "the new tagline (string, 1-2 sentences)",
      "cover_image_url": "" (leave empty — server fills),
      "video_url": null,
      "video_job_id": null,
      "tags": {
        "core_message_id": "from taxonomy",
        "visual_format_id": "from taxonomy",
        "pain_point_id": "from taxonomy",
        "hook_type_id": "from taxonomy"
      },
      "ae_brief": "1-2 sentence brief for designer: actor archetype, setting, tempo, key moment"
    }
  ]
}

Tags MUST use valid IDs from the taxonomy.
`

export async function generateTextVariants(
  brief: Brief,
  analysis: AnalysisResult,
  generationMode: "apply_existing_cm" | "propose_new_cm",
  variationAxes: string[] = [],
  apiKeyOverride?: string
): Promise<VariantsResult> {
  const ai = getClient(apiKeyOverride)
  const taxonomyBlock = formatTaxonomyForPrompt()

  const referenceText =
    brief.reference_type === "text"
      ? (brief.reference_text ?? "")
      : analysis.decomposition.transcript +
        "\n\n[VISUAL: " +
        analysis.decomposition.visual_summary +
        "]"

  const modeBlock =
    generationMode === "apply_existing_cm"
      ? `MODE: apply_existing_cm. Anchor variants on Core Message "${analysis.fit_check.mapped?.core_message_name}" (id: ${analysis.fit_check.mapped?.core_message_id}). Mix Visual Formats / Pain Points freely from taxonomy.`
      : `MODE: propose_new_cm. New Core Message: "${analysis.fit_check.proposed_new_cm?.suggested_name}". Closest existing: "${analysis.fit_check.proposed_new_cm?.closest_existing_name}". Reasoning: ${analysis.fit_check.proposed_new_cm?.reason}`

  const axesBlock =
    variationAxes.length > 0
      ? `VARIATION AXES (vary these dimensions across variants — each variant must change at least one axis from the reference): ${variationAxes.join(", ")}`
      : "VARIATION AXES: text, audience, tone"

  const audienceLine =
    brief.audience || analysis.decomposition.inferred_audience
  const painLine = brief.pain_context || analysis.decomposition.inferred_pains

  const userText = `${modeBlock}

REFERENCE HOOK:
${referenceText}

AUDIENCE: ${audienceLine}
PAIN CONTEXT: ${painLine}

${axesBlock}

GENERATE EXACTLY ${brief.variant_count} VARIANTS. Each must be VISUALLY DIFFERENT from the others — different visual_format, actor archetype, or pain angle.

${taxonomyBlock}`

  const response = await ai.models.generateContent({
    model: MODEL_TEXT_VISION,
    contents: [{ role: "user", parts: [{ text: userText }] }],
    config: {
      systemInstruction: VARIANTS_SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  })

  const raw = response.text
  if (!raw) throw new Error("Empty response from Gemini variants")

  const json = JSON.parse(raw)
  return VariantsResultSchema.parse(json)
}

// ─── Image generation (Nano Banana 2) ────────────────────────────────────────

// Image model fallback chain — try newest first, fall back if model doesn't exist
const IMAGE_MODELS = [
  "gemini-3.0-flash-image-preview", // "Nano Banana 2"
  "gemini-2.5-flash-image-preview", // "Nano Banana 1"
  "gemini-2.0-flash-exp-image-generation",
]

function uniqueSeed(prompt: string): string {
  // Simple deterministic hash so each unique prompt → unique picsum image
  let h = 5381
  for (let i = 0; i < prompt.length; i++) {
    h = (h * 33) ^ prompt.charCodeAt(i)
  }
  return Math.abs(h).toString(36)
}

export async function generateCoverImage(
  prompt: string,
  apiKeyOverride?: string
): Promise<string> {
  const ai = getClient(apiKeyOverride)

  for (const model of IMAGE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      })
      const candidates =
        (
          response as unknown as {
            candidates?: {
              content?: {
                parts?: {
                  inlineData?: { mimeType: string; data: string }
                }[]
              }
            }[]
          }
        ).candidates ?? []
      for (const c of candidates) {
        for (const part of c.content?.parts ?? []) {
          if (part.inlineData?.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        }
      }
      // Model returned no image — try next model
    } catch {
      // Model errored — try next
    }
  }

  // All models failed — fallback to picsum with UNIQUE deterministic seed
  // so each variant gets a different placeholder photo.
  return `https://picsum.photos/seed/${uniqueSeed(prompt)}/1080/1920`
}

// ─── Video generation (Veo via Gemini) ───────────────────────────────────────

export async function submitVeoVideo(prompt: string): Promise<string> {
  // Returns the operation name to poll.
  const ai = getClient()
  const op = await (
    ai.models as unknown as {
      generateVideos?: (args: {
        model: string
        prompt: string
        config?: { durationSeconds?: number; aspectRatio?: string }
      }) => Promise<{ name: string }>
    }
  ).generateVideos?.({
    model: MODEL_VIDEO,
    prompt,
    config: { durationSeconds: 8, aspectRatio: "9:16" },
  })

  if (!op || !op.name) {
    throw new Error(
      `Video generation not available on this Gemini key. Switch to Kling.`
    )
  }
  return op.name
}

export async function pollVeoVideo(operationName: string): Promise<{
  done: boolean
  video_url: string | null
  error: string | null
}> {
  const ai = getClient()
  const op = await (
    ai.operations as unknown as {
      getVideosOperation?: (args: { operation: string }) => Promise<{
        done: boolean
        error?: { message: string }
        response?: {
          generatedVideos?: { video?: { uri?: string } }[]
        }
      }>
    }
  ).getVideosOperation?.({ operation: operationName })

  if (!op) {
    return {
      done: true,
      video_url: null,
      error: "operations.getVideosOperation not available on this SDK",
    }
  }

  if (op.error) {
    return { done: true, video_url: null, error: op.error.message }
  }

  if (!op.done) {
    return { done: false, video_url: null, error: null }
  }

  const uri = op.response?.generatedVideos?.[0]?.video?.uri ?? null
  return { done: true, video_url: uri, error: uri ? null : "No video URI" }
}
