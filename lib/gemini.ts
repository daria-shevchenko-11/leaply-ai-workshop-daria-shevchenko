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
const MODEL_IMAGE = "gemini-3.0-flash-image-preview" // "Nano Banana 2"
const MODEL_VIDEO = "veo-3.1-preview"

// ─── Singleton client ────────────────────────────────────────────────────────
let client: GoogleGenAI | null = null
function getClient(): GoogleGenAI {
  if (!client) {
    if (!env.GOOGLE_AI_API_KEY) {
      throw new Error(
        "GOOGLE_AI_API_KEY is not set. Add it in Vercel → Project Settings → Environment Variables, then redeploy."
      )
    }
    client = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY })
  }
  return client
}

// ─── Hook analysis ───────────────────────────────────────────────────────────

const ANALYZE_SYSTEM_PROMPT = `You are a senior performance-marketing strategist for Leaply, a lymph-drainage / wellness product. Your job: analyze an ad hook (3-12 sec video or text description) and (a) decompose its elements, (b) check fit against Leaply's existing Core Message taxonomy.

ALWAYS reply with valid JSON ONLY, matching this exact shape:

{
  "decomposition": {
    "transcript": "what is being said, verbatim",
    "tone": "1-line description of speaking tone",
    "trigger": "primary emotional/cognitive trigger (fear, curiosity, authority, etc.)",
    "actor": "demographic + archetype of speaker",
    "tempo": "pacing description",
    "visual_summary": "what is shown on screen"
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
`

export async function analyzeHook(brief: Brief): Promise<AnalysisResult> {
  const ai = getClient()
  const taxonomyBlock = formatTaxonomyForPrompt()

  const userParts: {
    text?: string
    inlineData?: { mimeType: string; data: string }
  }[] = []

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
      text: `\n\nAUDIENCE: ${brief.audience}\nPAIN CONTEXT: ${brief.pain_context}\n\n${taxonomyBlock}\n\nAnalyze this video reference hook and return the JSON.`,
    })
  } else {
    userParts.push({
      text: `REFERENCE HOOK (text description):\n${brief.reference_text}\n\nAUDIENCE: ${brief.audience}\nPAIN CONTEXT: ${brief.pain_context}\n\n${taxonomyBlock}\n\nAnalyze and return the JSON.`,
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
  generationMode: "apply_existing_cm" | "propose_new_cm"
): Promise<VariantsResult> {
  const ai = getClient()
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

  const userText = `${modeBlock}

REFERENCE HOOK:
${referenceText}

AUDIENCE: ${brief.audience}
PAIN CONTEXT: ${brief.pain_context}

GENERATE EXACTLY ${brief.variant_count} VARIANTS.

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

export async function generateCoverImage(prompt: string): Promise<string> {
  // Returns a data URL or hosted URL for the generated image.
  const ai = getClient()
  try {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    })

    // Find image part in candidates
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
    // Fallback: picsum placeholder
    return `https://picsum.photos/seed/${encodeURIComponent(prompt).slice(0, 30)}/1080/1920`
  } catch {
    return `https://picsum.photos/seed/${encodeURIComponent(prompt).slice(0, 30)}/1080/1920`
  }
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
