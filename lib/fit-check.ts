// Pure logic for fit-check:
// - Loads taxonomy (Core Messages, Pain Points, Visual Formats, Hook Types) from message-matrix.json
// - Loads existing creative tasks from creative-tasks.json
// - Given a mapped fit (CM + VF + PP + HT), finds matching creative tasks
// - Formats taxonomy for injection into AI system prompts

import messageMatrixRaw from "@/lib/data/message-matrix.json"
import creativeTasksRaw from "@/lib/data/creative-tasks.json"
import type { FitMapped, LinkedTask } from "@/lib/schemas/hook-schemas"

type CoreMessage = {
  id: string
  name: string
  description: string
  examples: string[]
}
type PainPoint = { id: string; name: string; description: string }
type VisualFormat = { id: string; name: string; description: string }
type HookType = { id: string; name: string; description: string }

type CreativeTask = {
  id: number
  title: string
  hook_text: string
  core_message_id: string
  visual_format_id: string
  pain_point_id: string
  hook_type_id: string
  status: string
}

export const taxonomy = {
  core_messages: messageMatrixRaw.core_messages as CoreMessage[],
  pain_points: messageMatrixRaw.pain_points as PainPoint[],
  visual_formats: messageMatrixRaw.visual_formats as VisualFormat[],
  hook_types: messageMatrixRaw.hook_types as HookType[],
  variation_types: messageMatrixRaw.variation_types as string[],
}

export const creativeTasks: CreativeTask[] = creativeTasksRaw.tasks

export function findCoreMessage(id: string): CoreMessage | undefined {
  return taxonomy.core_messages.find((cm) => cm.id === id)
}

export function findPainPoint(id: string): PainPoint | undefined {
  return taxonomy.pain_points.find((pp) => pp.id === id)
}

export function findVisualFormat(id: string): VisualFormat | undefined {
  return taxonomy.visual_formats.find((vf) => vf.id === id)
}

export function findHookType(id: string): HookType | undefined {
  return taxonomy.hook_types.find((ht) => ht.id === id)
}

/**
 * Given a fit-check mapping, find matching creative tasks.
 * Scoring: 4 if all four IDs match, decreasing with each non-match.
 * Returns top `max` by score (default 5). Skips tasks with status "paused".
 */
export function findLinkedTasks(mapped: FitMapped, max = 5): LinkedTask[] {
  const scored = creativeTasks
    .filter((t) => t.status !== "paused")
    .map((t) => {
      let score = 0
      const reasons: string[] = []
      if (t.core_message_id === mapped.core_message_id) {
        score += 2
        reasons.push("Same core_message")
      }
      if (t.visual_format_id === mapped.visual_format_id) {
        score += 1
        reasons.push("Same visual_format")
      }
      if (t.pain_point_id === mapped.pain_point_id) {
        score += 1
        reasons.push("Same pain_point")
      }
      if (t.hook_type_id === mapped.hook_type_id) {
        score += 1
        reasons.push("Same hook_type")
      }
      return { task: t, score, reasons }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)

  return scored.map((s) => ({
    id: s.task.id,
    title: s.task.title,
    match_reason: s.reasons.join(" + "),
  }))
}

/**
 * Formats the entire taxonomy as a structured block for injection into
 * AI system prompts (Gemini analyze + variants generation).
 * Keeps it compact but clear.
 */
export function formatTaxonomyForPrompt(): string {
  const cmLines = taxonomy.core_messages
    .map((cm) => `  - ${cm.id}: "${cm.name}" — ${cm.description}`)
    .join("\n")
  const ppLines = taxonomy.pain_points
    .map((pp) => `  - ${pp.id}: "${pp.name}" — ${pp.description}`)
    .join("\n")
  const vfLines = taxonomy.visual_formats
    .map((vf) => `  - ${vf.id}: "${vf.name}" — ${vf.description}`)
    .join("\n")
  const htLines = taxonomy.hook_types
    .map((ht) => `  - ${ht.id}: "${ht.name}" — ${ht.description}`)
    .join("\n")

  return `LEAPLY TAXONOMY (use ONLY these IDs in mapping):

CORE MESSAGES (${taxonomy.core_messages.length}):
${cmLines}

PAIN POINTS (${taxonomy.pain_points.length}):
${ppLines}

VISUAL FORMATS (${taxonomy.visual_formats.length}):
${vfLines}

HOOK TYPES (${taxonomy.hook_types.length}):
${htLines}`
}
