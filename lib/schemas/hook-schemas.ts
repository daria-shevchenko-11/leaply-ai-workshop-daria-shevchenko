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

export const FitMappedSchema = z.object({
  core_message_id: z.string(),
  core_message_name: z.string(),
  visual_format_id: z.string(),
  visual_format_name: z.string(),
  pain_point_id: z.string(),
  pain_point_name: z.string(),
  hook_type_id: z.string(),
  hook_type_name: z.string(),
})
export type FitMapped = z.infer<typeof FitMappedSchema>

export const ProposedNewCMSchema = z.object({
  suggested_name: z.string(),
  closest_existing_id: z.string(),
  closest_existing_name: z.string(),
  reason: z.string(),
  recommended_visual_format_ids: z.array(z.string()),
})
export type ProposedNewCM = z.infer<typeof ProposedNewCMSchema>

export const FitCheckSchema = z.object({
  status: z.enum(["existing", "new"]),
  confidence: z.number().min(0).max(1),
  mapped: FitMappedSchema.nullable(),
  proposed_new_cm: ProposedNewCMSchema.nullable(),
  reasoning: z.string(),
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
