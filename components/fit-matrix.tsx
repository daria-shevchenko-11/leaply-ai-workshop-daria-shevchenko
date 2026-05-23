"use client"

// Compact CM × VF matrix showing where the analyzed hook lands.
// Mimics the hokuto.leaplyhub.com Message × Format matrix but for one hook.
// Highlights mapped cell with ✓, shows existing task counts per cell.
// When Hokuto env vars are set on server, also shows live $spend · #ads · trend%.

import { useEffect, useState } from "react"
import type { FitMapped } from "@/lib/schemas/hook-schemas"
import { taxonomy, creativeTasks } from "@/lib/fit-check"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { HokutoMatrix, HokutoCellMetrics } from "@/lib/hokuto"

type Props = {
  mapped: FitMapped | null
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function cellLine(m: HokutoCellMetrics | undefined): string {
  if (!m) return ""
  const parts: string[] = []
  if (typeof m.spend === "number") parts.push(formatMoney(m.spend))
  if (typeof m.ads_count === "number") parts.push(`${m.ads_count} ads`)
  if (typeof m.trend_pct === "number") {
    const arrow = m.trend_pct >= 0 ? "↗" : "↘"
    parts.push(`${arrow}${Math.abs(m.trend_pct).toFixed(0)}%`)
  }
  return parts.join(" · ")
}

export function FitMatrix({ mapped }: Props) {
  const [hokuto, setHokuto] = useState<HokutoMatrix | null>(null)
  const [hokutoLoaded, setHokutoLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/hokuto/matrix")
      .then((r) => r.json())
      .then((j: { matrix: HokutoMatrix | null }) => {
        if (cancelled) return
        setHokuto(j.matrix)
        setHokutoLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setHokutoLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!mapped) return null

  // Count tasks per CM × VF cell from local snapshot
  const counts: Record<string, Record<string, number>> = {}
  for (const t of creativeTasks) {
    if (t.status === "paused") continue
    if (!counts[t.core_message_id]) counts[t.core_message_id] = {}
    counts[t.core_message_id][t.visual_format_id] =
      (counts[t.core_message_id][t.visual_format_id] ?? 0) + 1
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          📊 Position on Leaply matrix
          <Badge variant="outline" className="text-[10px] uppercase">
            CM × Visual Format
          </Badge>
          {hokutoLoaded && hokuto && (
            <Badge
              variant="outline"
              className="border-green-500/40 text-[10px] text-green-700 uppercase dark:text-green-300"
            >
              live · hokuto
            </Badge>
          )}
          {hokutoLoaded && !hokuto && (
            <Badge variant="outline" className="text-[10px] uppercase">
              snapshot
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Зелена клітинка = куди потрапляє цей хук.{" "}
          {hokuto
            ? "$spend · #ads · trend% з Hokuto."
            : "Числа = існуючі creative tasks (Hokuto live — додай HOKUTO_API_TOKEN у Vercel)."}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-background p-1 text-left text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Core Message ↓ / VF →
                </th>
                {taxonomy.visual_formats.map((vf) => {
                  const isMappedCol = vf.id === mapped.visual_format_id
                  return (
                    <th
                      key={vf.id}
                      className={`p-1 text-center text-[10px] font-semibold whitespace-nowrap ${
                        isMappedCol
                          ? "bg-green-500/10 text-green-700 dark:text-green-300"
                          : "text-muted-foreground"
                      }`}
                      style={{ minWidth: "70px" }}
                    >
                      {vf.name}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {taxonomy.core_messages.map((cm) => {
                const isMappedRow = cm.id === mapped.core_message_id
                return (
                  <tr key={cm.id}>
                    <td
                      className={`sticky left-0 bg-background p-1 text-left text-[11px] whitespace-nowrap ${
                        isMappedRow
                          ? "bg-green-500/10 font-bold text-green-700 dark:text-green-300"
                          : ""
                      }`}
                      title={cm.description}
                    >
                      {cm.name}
                    </td>
                    {taxonomy.visual_formats.map((vf) => {
                      const count = counts[cm.id]?.[vf.id] ?? 0
                      const isMappedCell =
                        cm.id === mapped.core_message_id &&
                        vf.id === mapped.visual_format_id
                      const isMappedCol = vf.id === mapped.visual_format_id
                      const hokutoMetrics = hokuto?.cells?.[cm.id]?.[vf.id]
                      const metricsLine = cellLine(hokutoMetrics)
                      return (
                        <td
                          key={vf.id}
                          className={`border border-muted p-1 text-center align-top ${
                            isMappedCell
                              ? "border-2 border-green-500 bg-green-500/20 font-bold"
                              : isMappedRow || isMappedCol
                                ? "bg-green-500/5"
                                : ""
                          }`}
                        >
                          {isMappedCell && (
                            <div className="text-green-700 dark:text-green-300">
                              ✓ HERE
                            </div>
                          )}
                          {metricsLine ? (
                            <div className="text-[9px] leading-tight whitespace-nowrap text-muted-foreground">
                              {metricsLine}
                            </div>
                          ) : !isMappedCell && count > 0 ? (
                            <div className="text-muted-foreground">{count}</div>
                          ) : !isMappedCell ? (
                            <div className="text-muted-foreground/30">·</div>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
