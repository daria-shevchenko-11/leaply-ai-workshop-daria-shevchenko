"use client"

import { useHookStore } from "@/lib/stores/hook-store"
import {
  taxonomy,
  findCoreMessage,
  findVisualFormat,
  findPainPoint,
  findHookType,
} from "@/lib/fit-check"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function AnalysisCard() {
  const analysis = useHookStore((s) => s.analysis)
  const setMapped = useHookStore((s) => s.setMapped)
  const setFitStatus = useHookStore((s) => s.setFitStatus)
  const setProposedNewCM = useHookStore((s) => s.setProposedNewCM)
  const setAnalysis = useHookStore((s) => s.setAnalysis)

  if (!analysis) return null

  const { decomposition, fit_check, linked_tasks } = analysis

  function updateDecompField(
    field: "inferred_audience" | "inferred_pains",
    value: string
  ) {
    if (!analysis) return
    setAnalysis({
      ...analysis,
      decomposition: { ...analysis.decomposition, [field]: value },
    })
  }

  return (
    <div className="space-y-4">
      {/* Why it works — hero callout */}
      {decomposition.why_it_works && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold tracking-widest uppercase">
              ЧОМУ ЦЕ ЧІПЛЯЄ
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            {decomposition.why_it_works}
          </CardContent>
        </Card>
      )}

      {/* AI-inferred audience + pains — editable */}
      <Card className="border-blue-500/40">
        <CardHeader>
          <CardTitle className="text-base">
            AI-inferred (edit if wrong)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              👥 Цільова аудиторія
            </label>
            <Input
              value={decomposition.inferred_audience ?? ""}
              onChange={(e) =>
                updateDecompField("inferred_audience", e.target.value)
              }
              placeholder="напр.: Sedentary office workers 35-55"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              💢 Болі / триггери
            </label>
            <Textarea
              value={decomposition.inferred_pains ?? ""}
              onChange={(e) =>
                updateDecompField("inferred_pains", e.target.value)
              }
              placeholder="напр.: morning swelling, neck stiffness"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Decomposition */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hook Decomposition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <FieldRow
            label="📝 Текст / транскрипт"
            value={decomposition.transcript}
          />
          <FieldRow label="🎭 Тон" value={decomposition.tone} />
          <FieldRow label="💥 Тригер" value={decomposition.trigger} />
          <FieldRow label="👤 Актор" value={decomposition.actor} />
          <FieldRow label="⏱  Темп" value={decomposition.tempo} />
          <FieldRow label="🎨 Візуал" value={decomposition.visual_summary} />
        </CardContent>
      </Card>

      {/* Fit Check */}
      <Card
        className={
          fit_check.status === "existing"
            ? "border-green-500/40"
            : "border-blue-500/40"
        }
      >
        <CardHeader>
          <CardTitle className="text-base">
            Fit Check (vs Leaply taxonomy){" "}
            <Badge variant="secondary" className="ml-2">
              {Math.round(fit_check.confidence * 100)}% confidence
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFitStatus("existing")}
              className={`rounded-md border px-3 py-1 text-xs font-medium ${
                fit_check.status === "existing"
                  ? "border-green-600 bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100"
                  : "border-muted bg-background"
              }`}
            >
              ✅ Existing fit
            </button>
            <button
              type="button"
              onClick={() => setFitStatus("new")}
              className={`rounded-md border px-3 py-1 text-xs font-medium ${
                fit_check.status === "new"
                  ? "border-blue-600 bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100"
                  : "border-muted bg-background"
              }`}
            >
              🆕 Proposed new
            </button>
          </div>

          {fit_check.status === "existing" && fit_check.mapped && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <DropdownRow
                label="Core Message"
                value={fit_check.mapped.core_message_id}
                options={taxonomy.core_messages.map((cm) => ({
                  value: cm.id,
                  label: cm.name,
                }))}
                onChange={(v) => {
                  const cm = findCoreMessage(v)
                  if (cm && fit_check.mapped)
                    setMapped({
                      ...fit_check.mapped,
                      core_message_id: cm.id,
                      core_message_name: cm.name,
                    })
                }}
              />
              <DropdownRow
                label="Visual Format"
                value={fit_check.mapped.visual_format_id}
                options={taxonomy.visual_formats.map((vf) => ({
                  value: vf.id,
                  label: vf.name,
                }))}
                onChange={(v) => {
                  const vf = findVisualFormat(v)
                  if (vf && fit_check.mapped)
                    setMapped({
                      ...fit_check.mapped,
                      visual_format_id: vf.id,
                      visual_format_name: vf.name,
                    })
                }}
              />
              <DropdownRow
                label="Pain Point"
                value={fit_check.mapped.pain_point_id}
                options={taxonomy.pain_points.map((pp) => ({
                  value: pp.id,
                  label: pp.name,
                }))}
                onChange={(v) => {
                  const pp = findPainPoint(v)
                  if (pp && fit_check.mapped)
                    setMapped({
                      ...fit_check.mapped,
                      pain_point_id: pp.id,
                      pain_point_name: pp.name,
                    })
                }}
              />
              <DropdownRow
                label="Hook Type"
                value={fit_check.mapped.hook_type_id}
                options={taxonomy.hook_types.map((ht) => ({
                  value: ht.id,
                  label: ht.name,
                }))}
                onChange={(v) => {
                  const ht = findHookType(v)
                  if (ht && fit_check.mapped)
                    setMapped({
                      ...fit_check.mapped,
                      hook_type_id: ht.id,
                      hook_type_name: ht.name,
                    })
                }}
              />
            </div>
          )}

          {fit_check.status === "new" && fit_check.proposed_new_cm && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Suggested name
                </label>
                <Input
                  value={fit_check.proposed_new_cm.suggested_name}
                  onChange={(e) => {
                    if (fit_check.proposed_new_cm)
                      setProposedNewCM({
                        ...fit_check.proposed_new_cm,
                        suggested_name: e.target.value,
                      })
                  }}
                />
              </div>
              <div className="text-xs">
                <span className="font-medium">Closest existing:</span>{" "}
                {fit_check.proposed_new_cm.closest_existing_name}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Why new
                </label>
                <Textarea
                  value={fit_check.proposed_new_cm.reason}
                  onChange={(e) => {
                    if (fit_check.proposed_new_cm)
                      setProposedNewCM({
                        ...fit_check.proposed_new_cm,
                        reason: e.target.value,
                      })
                  }}
                  rows={2}
                />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground italic">
            {fit_check.reasoning}
          </p>
        </CardContent>
      </Card>

      {/* Linked Tasks */}
      {fit_check.status === "existing" && linked_tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Linked Existing Creative Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">
              Цей хук можна застосувати до існуючих тасок:
            </p>
            <ul className="space-y-1.5">
              {linked_tasks.map((t) => (
                <li key={t.id} className="flex items-baseline gap-2">
                  <Badge variant="outline" className="font-mono">
                    #{t.id}
                  </Badge>
                  <span className="font-medium">{t.title}</span>
                  <span className="text-xs text-muted-foreground">
                    — {t.match_reason}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function DropdownRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border bg-background px-2 py-1 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
