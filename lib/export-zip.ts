// Builds a ZIP of approved variants for marketer download.
// Loaded dynamically so jszip doesn't bloat the initial bundle.
//
// Structure:
//   text-variants.csv
//   covers/variant-{id}.png  (best-effort fetch — may fail if URL is cross-origin)
//   videos/variant-{id}.mp4  (if available)
//   airtable-tasks.json      (full task draft with linked_task_ids + tags)

import type { Variant, AnalysisResult, Brief } from "@/lib/schemas/hook-schemas"

type ExportPayload = {
  brief: Brief
  analysis: AnalysisResult
  approved_variants: Variant[]
  generation_mode: "apply_existing_cm" | "propose_new_cm"
}

type JSZipInstance = {
  file: (name: string, data: string | Blob) => void
  generateAsync: (opts: { type: "blob" }) => Promise<Blob>
}

export async function buildApprovedZip(payload: ExportPayload): Promise<Blob> {
  const mod = await import("jszip")
  const JSZip = (mod as unknown as { default: new () => JSZipInstance }).default
  const zip = new JSZip()

  // --- text-variants.csv
  const csvHeader =
    "variant_id,hook_text,core_message,visual_format,pain_point,hook_type,ae_brief\n"
  const csvRows = payload.approved_variants
    .map((v) => {
      const cells = [
        v.id,
        v.hook_text,
        v.tags.core_message_id,
        v.tags.visual_format_id,
        v.tags.pain_point_id,
        v.tags.hook_type_id,
        v.ae_brief,
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`)
      return cells.join(",")
    })
    .join("\n")
  zip.file("text-variants.csv", csvHeader + csvRows)

  // --- airtable-tasks.json
  const airtableTasks = {
    source: {
      reference_type: payload.brief.reference_type,
      reference_text: payload.brief.reference_text ?? null,
      audience: payload.brief.audience,
      pain_context: payload.brief.pain_context,
    },
    fit_status: payload.analysis.fit_check.status,
    linked_task_ids: payload.analysis.linked_tasks.map((t) => t.id),
    proposed_new_cm:
      payload.analysis.fit_check.status === "new"
        ? payload.analysis.fit_check.proposed_new_cm
        : null,
    generation_mode: payload.generation_mode,
    variants: payload.approved_variants.map((v) => ({
      variant_id: v.id,
      hook_text: v.hook_text,
      core_message: v.tags.core_message_id,
      visual_format: v.tags.visual_format_id,
      pain_point: v.tags.pain_point_id,
      hook_type: v.tags.hook_type_id,
      cover_image_url: v.cover_image_url,
      video_url: v.video_url,
      ae_brief: v.ae_brief,
      status: "To design",
    })),
  }
  zip.file("airtable-tasks.json", JSON.stringify(airtableTasks, null, 2))

  // --- covers (best-effort)
  const coverPromises = payload.approved_variants.map(async (v) => {
    if (!v.cover_image_url) return
    try {
      const res = await fetch(v.cover_image_url)
      if (!res.ok) return
      const blob = await res.blob()
      const ext = blob.type.split("/")[1] || "png"
      zip.file(`covers/variant-${v.id}.${ext}`, blob)
    } catch {
      // ignore
    }
  })

  const videoPromises = payload.approved_variants.map(async (v) => {
    if (!v.video_url) return
    try {
      const res = await fetch(v.video_url)
      if (!res.ok) return
      const blob = await res.blob()
      const ext = blob.type.split("/")[1] || "mp4"
      zip.file(`videos/variant-${v.id}.${ext}`, blob)
    } catch {
      // ignore
    }
  })

  await Promise.all([...coverPromises, ...videoPromises])

  return await zip.generateAsync({ type: "blob" })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
