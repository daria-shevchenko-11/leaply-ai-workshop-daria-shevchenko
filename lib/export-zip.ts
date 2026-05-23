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

// Folder-safe slug: lowercase, alphanumeric + dashes only, no traversal
function safeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export async function buildApprovedZip(payload: ExportPayload): Promise<Blob> {
  const mod = await import("jszip")
  const JSZip = (mod as unknown as { default: new () => JSZipInstance }).default
  const zip = new JSZip()

  // Partition approved variants: regular (grouped by CM) vs frankensteins
  const approved = payload.approved_variants
  const regular = approved.filter((v) => !v.is_frankenstein)
  const frankensteins = approved.filter((v) => v.is_frankenstein)

  // Group regulars by core_message_id
  const byCm: Record<string, typeof approved> = {}
  for (const v of regular) {
    const cm = v.tags.core_message_id
    if (!byCm[cm]) byCm[cm] = []
    byCm[cm].push(v)
  }

  // README at root, explains the structure
  const readme = [
    "# Hook Factory export",
    "",
    `Source brief: ${payload.brief.reference_type === "video" ? "video upload" : "text reference"}`,
    `Audience: ${payload.brief.audience || "(AI-inferred)"}`,
    `Pain context: ${payload.brief.pain_context || "(AI-inferred)"}`,
    `Fit status: ${payload.analysis.fit_check.status}`,
    `Generation mode: ${payload.generation_mode}`,
    "",
    "## Structure",
    "",
    "Each Core Message gets its own folder. All variants inside share that",
    "Core Message but vary on Visual Format / Pain Angle / Tone.",
    "",
    "Frankensteins (mix-and-match variants combining multiple winning formats",
    "in a single ad) get their own /frankensteins/ folder — each is fully",
    "specified for production.",
    "",
    "- airtable-tasks.json — flat list of all approved variants for Airtable import",
    ...Object.keys(byCm).map(
      (cm) => `- ${safeSlug(cm)}/ — ${byCm[cm].length} variant(s) under "${cm}"`
    ),
    frankensteins.length > 0
      ? `- frankensteins/ — ${frankensteins.length} mix-and-match variant(s)`
      : "",
  ]
    .filter(Boolean)
    .join("\n")
  zip.file("README.md", readme)

  // Helper to write one variant's assets to a given folder
  async function writeVariantToFolder(
    folder: string,
    v: (typeof approved)[number]
  ) {
    const vfSlug = safeSlug(v.tags.visual_format_id)
    const baseName = `variant-${v.id}-${vfSlug}`

    // Meta JSON per variant
    const meta = {
      variant_id: v.id,
      hook_text: v.hook_text,
      core_message: v.tags.core_message_id,
      visual_format: v.tags.visual_format_id,
      pain_point: v.tags.pain_point_id,
      hook_type: v.tags.hook_type_id,
      ae_brief: v.ae_brief,
      cover_image_url: v.cover_image_url,
      video_url: v.video_url,
      is_frankenstein: v.is_frankenstein,
      status: "To design",
    }
    zip.file(`${folder}/${baseName}.json`, JSON.stringify(meta, null, 2))

    // Cover image (best-effort fetch)
    if (v.cover_image_url) {
      try {
        const res = await fetch(v.cover_image_url)
        if (res.ok) {
          const blob = await res.blob()
          const ext = blob.type.split("/")[1] || "png"
          zip.file(`${folder}/${baseName}.${ext}`, blob)
        }
      } catch {
        // ignore
      }
    }

    // Video (best-effort fetch)
    if (v.video_url) {
      try {
        const res = await fetch(v.video_url)
        if (res.ok) {
          const blob = await res.blob()
          const ext = blob.type.split("/")[1] || "mp4"
          zip.file(`${folder}/${baseName}.${ext}`, blob)
        }
      } catch {
        // ignore
      }
    }
  }

  // Write regular CM folders
  const writes: Promise<void>[] = []
  for (const cm of Object.keys(byCm)) {
    const folder = safeSlug(cm)
    for (const v of byCm[cm]) {
      writes.push(writeVariantToFolder(folder, v))
    }
  }
  // Write frankensteins folder
  for (const v of frankensteins) {
    writes.push(writeVariantToFolder("frankensteins", v))
  }

  // Combined CSV at root
  const csvHeader =
    "folder,variant_id,hook_text,core_message,visual_format,pain_point,hook_type,is_frankenstein,ae_brief\n"
  const csvRows = approved
    .map((v) => {
      const folder = v.is_frankenstein
        ? "frankensteins"
        : safeSlug(v.tags.core_message_id)
      const cells = [
        folder,
        v.id,
        v.hook_text,
        v.tags.core_message_id,
        v.tags.visual_format_id,
        v.tags.pain_point_id,
        v.tags.hook_type_id,
        v.is_frankenstein ? "true" : "false",
        v.ae_brief,
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`)
      return cells.join(",")
    })
    .join("\n")
  zip.file("variants.csv", csvHeader + csvRows)

  // Airtable JSON at root
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
    folders: {
      ...Object.fromEntries(
        Object.keys(byCm).map((cm) => [safeSlug(cm), byCm[cm].length])
      ),
      ...(frankensteins.length > 0
        ? { frankensteins: frankensteins.length }
        : {}),
    },
    variants: approved.map((v) => ({
      folder: v.is_frankenstein
        ? "frankensteins"
        : safeSlug(v.tags.core_message_id),
      variant_id: v.id,
      hook_text: v.hook_text,
      core_message: v.tags.core_message_id,
      visual_format: v.tags.visual_format_id,
      pain_point: v.tags.pain_point_id,
      hook_type: v.tags.hook_type_id,
      cover_image_url: v.cover_image_url,
      video_url: v.video_url,
      ae_brief: v.ae_brief,
      is_frankenstein: v.is_frankenstein,
      status: "To design",
    })),
  }
  zip.file("airtable-tasks.json", JSON.stringify(airtableTasks, null, 2))

  await Promise.all(writes)

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
