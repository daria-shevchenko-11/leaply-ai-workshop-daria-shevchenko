import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Brief (form input)
// ─────────────────────────────────────────────────────────────────────────────

export const BriefSchema = z.object({
  reference_type: z.enum(["text", "video"]),
  reference_text: z.string().optional(),
  reference_video_data_url: z.string().optional(),
  // Optional — AI infers from video if missing. User can override on Step 2.
  audience: z.string().optional().default(""),
  pain_context: z.string().optional().default(""),
  variant_count: z.number().int().min(1).max(10),
})
export type Brief = z.infer<typeof BriefSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Analysis + Fit-Check
// ─────────────────────────────────────────────────────────────────────────────

export const HookDecompositionSchema = z.object({
  transcript: z.string(),
  tone: z.string(),
  trigger: z.string(),
  actor: z.string(),
  tempo: z.string(),
  visual_summary: z.string(),
  // AI-inferred (Step 2 fields the user can edit)
  inferred_audience: z.string().default(""),
  inferred_pains: z.string().default(""),
  why_it_works: z.string().default(""),
})
export type HookDecomposition = z.infer<typeof HookDecompositionSchema>

// Forgiving preprocessor: empty string / undefined / {} → null,
// otherwise pass through. Gemini sometimes returns "" instead of null for
// the unused branch of fit_check.
const tolerantNull = (v: unknown) => {
  if (v === "" || v == null) return null
  if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)
    return null
  return v
}

export const FitMappedSchema = z.object({
  core_message_id: z.string().default(""),
  core_message_name: z.string().default(""),
  visual_format_id: z.string().default(""),
  visual_format_name: z.string().default(""),
  pain_point_id: z.string().default(""),
  pain_point_name: z.string().default(""),
  hook_type_id: z.string().default(""),
  hook_type_name: z.string().default(""),
})
export type FitMapped = z.infer<typeof FitMappedSchema>

export const ProposedNewCMSchema = z.object({
  suggested_name: z.string().default(""),
  closest_existing_id: z.string().default(""),
  closest_existing_name: z.string().default(""),
  reason: z.string().default(""),
  recommended_visual_format_ids: z.array(z.string()).default([]),
})
export type ProposedNewCM = z.infer<typeof ProposedNewCMSchema>

export const FitCheckSchema = z.object({
  status: z.enum(["existing", "new"]).default("existing"),
  confidence: z.number().min(0).max(1).default(0.5),
  mapped: z.preprocess(tolerantNull, FitMappedSchema.nullable()),
  proposed_new_cm: z.preprocess(tolerantNull, ProposedNewCMSchema.nullable()),
  reasoning: z.string().default(""),
})
export type FitCheck = z.infer<typeof FitCheckSchema>

export const LinkedTaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  match_reason: z.string(),
})
export type LinkedTask = z.infer<typeof LinkedTaskSchema>

export const AnalysisResultSchema = z.object({
  decomposition: HookDecompositionSchema,
  fit_check: FitCheckSchema,
  linked_tasks: z.array(LinkedTaskSchema),
})
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Variants
// ─────────────────────────────────────────────────────────────────────────────

export const VariantTagsSchema = z.object({
  core_message_id: z.string(),
  visual_format_id: z.string(),
  pain_point_id: z.string(),
  hook_type_id: z.string(),
})
export type VariantTags = z.infer<typeof VariantTagsSchema>

export const VariantSchema = z.object({
  id: z.string(),
  hook_text: z.string(),
  cover_image_url: z.string(),
  video_url: z.string().nullable(),
  video_job_id: z.string().nullable(),
  tags: VariantTagsSchema,
  ae_brief: z.string(),
  // Frankensteins are mix-and-match variants pulling from multiple winning
  // formats; they get their own folder in the export and are shown in a
  // separate section in Step 4-5. Default false.
  is_frankenstein: z.boolean().default(false),
})
export type Variant = z.infer<typeof VariantSchema>

export const VariantsResultSchema = z.object({
  variants: z.array(VariantSchema),
})
export type VariantsResult = z.infer<typeof VariantsResultSchema>

// ─────────────────────────────────────────────────────────────────────────────
// API request bodies
// ─────────────────────────────────────────────────────────────────────────────

export const AnalyzeRequestSchema = BriefSchema
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>

export const VariationAxisSchema = z.enum([
  "text",
  "audience",
  "tone",
  "character",
  "pain",
  "format",
  "frankenstein",
])
export type VariationAxis = z.infer<typeof VariationAxisSchema>

export const GenerateVariantsRequestSchema = z.object({
  brief: BriefSchema,
  analysis: AnalysisResultSchema,
  generation_mode: z.enum(["apply_existing_cm", "propose_new_cm"]),
  variation_axes: z.array(VariationAxisSchema).default([]),
})
export type GenerateVariantsRequest = z.infer<
  typeof GenerateVariantsRequestSchema
>

export const StartVideoRequestSchema = z.object({
  variant: VariantSchema,
})
export type StartVideoRequest = z.infer<typeof StartVideoRequestSchema>

export const VideoStatusResponseSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]),
  video_url: z.string().nullable(),
  error: z.string().nullable(),
})
export type VideoStatusResponse = z.infer<typeof VideoStatusResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Kling / Nano Banana prompts per variant
// (lite — single-shot for the 8-sec hook; full Production Sheet is Sprint C)
// ─────────────────────────────────────────────────────────────────────────────

export const KlingPromptsSchema = z.object({
  // Nano Banana — static image (first frame). Vertical 9:16, no text/logos.
  image_prompt: z.string(),
  // Kling Omni — image-to-video, dialogue + motion + camera + ambience.
  video_prompt: z.string(),
  // Sound design cue (no background music — added in editor).
  ambience_note: z.string().default(""),
  // Voice direction (tone / register / pacing / emotion) — inline in video_prompt
  // already, but exposed here for clarity.
  voice_direction: z.string().default(""),
  // Whether the hook fits in one 10s Kling shot or needs split (4.9+4.10).
  needs_split: z.boolean().default(false),
  // If needs_split — second-shot prompts.
  split_video_prompt: z.string().nullable().default(null),
})
export type KlingPrompts = z.infer<typeof KlingPromptsSchema>

export const KlingPromptsResponseSchema = z.object({
  variant_id: z.string(),
  prompts: KlingPromptsSchema,
})
export type KlingPromptsResponse = z.infer<typeof KlingPromptsResponseSchema>

export const KlingPromptsRequestSchema = z.object({
  variant: VariantSchema,
  analysis: AnalysisResultSchema,
})
export type KlingPromptsRequest = z.infer<typeof KlingPromptsRequestSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Production Sheet (multi-shot, Character Passports, per Daria's full template)
// ─────────────────────────────────────────────────────────────────────────────

export const CharacterPassportSchema = z.object({
  name: z.string(),
  descriptor: z.string(), // short visual descriptor used in parens (e.g. "the pale pink kitten in pastel blue floral dress")
  passport_prompt: z.string(), // frontal full-body, neutral backdrop, full outfit — for Nano Banana identity ref
})
export type CharacterPassport = z.infer<typeof CharacterPassportSchema>

export const ShotSchema = z.object({
  id: z.string(), // s1, s2, s3...
  title: z.string(), // short scene name
  duration_sec: z.number().min(1).max(20),
  characters_in_shot: z.array(z.string()).default([]), // character names
  dialogue: z.string().default(""), // exact line(s) — or "no dialogue / [diegetic note]"
  on_camera: z.boolean().default(true), // true=lip-sync counts to 10s limit, false=VO-only
  image_prompt: z.string(), // Nano Banana — static first frame, all hard rules
  video_prompt: z.string(), // Kling Omni — motion + dialogue + ambience
  ambience_note: z.string().default(""),
  voice_direction: z.string().default(""),
  editor_overlay_note: z.string().default(""), // text overlays / CTA cards / day markers
  needs_split: z.boolean().default(false),
  split_video_prompt: z.string().nullable().default(null),
})
export type Shot = z.infer<typeof ShotSchema>

export const ProductionSheetSchema = z.object({
  title: z.string(),
  scenario_summary: z.string(),
  visual_style: z.string(),
  characters: z.array(CharacterPassportSchema),
  shots: z.array(ShotSchema),
  totals: z
    .object({
      total_duration_sec: z.number().default(0),
      scene_count: z.number().default(0),
      character_count: z.number().default(0),
      shot_count: z.number().default(0),
    })
    .default({
      total_duration_sec: 0,
      scene_count: 0,
      character_count: 0,
      shot_count: 0,
    }),
  voice_casting_note: z.string().default(""), // ElevenLabs reco + character voice lock note
  music_cue_note: z.string().default(""),
  subtitle_spec: z.string().default(""),
})
export type ProductionSheet = z.infer<typeof ProductionSheetSchema>

export const ProductionSheetRequestSchema = z.object({
  scenario: z.string().min(10),
  characters_brief: z.string().default(""),
  visual_style: z.string().default(""),
  target_duration_sec: z.number().min(8).max(180).default(30),
})
export type ProductionSheetRequest = z.infer<
  typeof ProductionSheetRequestSchema
>
