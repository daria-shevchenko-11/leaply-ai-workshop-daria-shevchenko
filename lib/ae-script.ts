// Generates an After Effects JSX script for approved variants.
// Pure JS — no API calls, no deps. Runs entirely client-side.
//
// Usage:
//   const jsx = generateAEScript(approvedVariants, taxonomyLabels)
//   downloadBlob(new Blob([jsx], { type: "text/plain" }), "HookFactory.jsx")
//
// Designer opens the .jsx in After Effects via File → Scripts → Run Script File.
// Creates one composition per variant with:
//   - 1080x1920 (9:16), 10 sec
//   - Hook text layer (editable)
//   - Red "brief" text layer with actor/visual notes (DELETE BEFORE RENDER)
//   - Marker at 0s and 10s

import type { Variant } from "@/lib/schemas/hook-schemas"
import {
  findCoreMessage,
  findPainPoint,
  findVisualFormat,
  findHookType,
} from "@/lib/fit-check"

export function generateAEScript(approvedVariants: Variant[]): string {
  if (approvedVariants.length === 0) {
    return "// No approved variants. Approve at least one variant before exporting."
  }

  const dateStr = new Date().toLocaleDateString("uk-UA")
  const safeDate = dateStr.replace(/\./g, "_")

  // Pre-format variants with resolved taxonomy labels for the AE brief layer
  const variantsForScript = approvedVariants.map((v) => {
    const cm = findCoreMessage(v.tags.core_message_id)
    const vf = findVisualFormat(v.tags.visual_format_id)
    const pp = findPainPoint(v.tags.pain_point_id)
    const ht = findHookType(v.tags.hook_type_id)
    return {
      id: v.id,
      text: v.hook_text,
      ae_brief: v.ae_brief,
      core_message: cm?.name ?? v.tags.core_message_id,
      visual_format: vf?.name ?? v.tags.visual_format_id,
      pain_point: pp?.name ?? v.tags.pain_point_id,
      hook_type: ht?.name ?? v.tags.hook_type_id,
    }
  })

  const variantsJson = JSON.stringify(variantsForScript, null, 2)

  return `// 🎣 HOOK FACTORY — After Effects Script
// Generated: ${dateStr} · ${approvedVariants.length} variants
// HOW TO USE: File → Scripts → Run Script File

(function () {
  var proj = app.project
  var W = 1080
  var H = 1920
  var FPS = 30
  var DUR = 10
  var folder = proj.items.addFolder("HookFactory_${safeDate}")
  var variants = ${variantsJson}

  for (var i = 0; i < variants.length; i++) {
    var v = variants[i]
    var safeId = String(v.id).replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)
    var name = "Hook_" + safeId
    var comp = proj.items.addComp(name, W, H, 1, DUR, FPS)
    comp.parentFolder = folder
    comp.bgColor = [0.05, 0.05, 0.05]

    // Markers
    comp.markerProperty.setValueAtTime(0, new MarkerValue("start"))
    comp.markerProperty.setValueAtTime(DUR - 0.1, new MarkerValue("end"))

    // Hook text layer — editable, white with black stroke
    var tl = comp.layers.addText(v.text)
    tl.name = "HOOK TEXT ← edit me"
    var td = tl.property("Source Text").value
    td.font = "ArialMT"
    td.fontSize = 68
    td.fillColor = [1, 1, 1]
    td.strokeColor = [0, 0, 0]
    td.strokeWidth = 2
    td.applyStroke = true
    td.justification = ParagraphJustification.CENTER_JUSTIFY
    td.tracking = 5
    tl.property("Source Text").setValue(td)
    tl.property("Transform").property("Position").setValue([W / 2, H * 0.72])
    tl.property("Transform").property("Scale").setValue([85, 85])

    // Brief layer — red, will be deleted before render
    var brief =
      "╔══ AE BRIEF — DELETE BEFORE RENDER ══╗\\n\\n" +
      "Variant:      " + v.id + "\\n" +
      "Core msg:     " + v.core_message + "\\n" +
      "Format:       " + v.visual_format + "\\n" +
      "Pain:         " + v.pain_point + "\\n" +
      "Hook type:    " + v.hook_type + "\\n\\n" +
      "DIRECTION:\\n" + v.ae_brief + "\\n\\n" +
      "╚════════════════════════════════════╝"

    var bl = comp.layers.addText(brief)
    bl.name = "⚠️ BRIEF — DELETE BEFORE RENDER"
    bl.label = 2 // red color
    var bd = bl.property("Source Text").value
    bd.font = "CourierNewPSMT"
    bd.fontSize = 22
    bd.fillColor = [1, 0.4, 0.4]
    bd.justification = ParagraphJustification.LEFT_JUSTIFY
    bl.property("Source Text").setValue(bd)
    bl.property("Transform").property("Position").setValue([60, 200])
    bl.property("Transform").property("AnchorPoint").setValue([0, 0])
    bl.shy = true
  }

  alert(
    "✅ " +
      variants.length +
      " compositions created in folder HookFactory_${safeDate}!\\n\\n" +
      "⚠️ Delete the RED brief layers before final render."
  )
})()
`
}

export function downloadAEScript(approvedVariants: Variant[]) {
  const jsx = generateAEScript(approvedVariants)
  const blob = new Blob([jsx], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `HookFactory_${Date.now()}.jsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
