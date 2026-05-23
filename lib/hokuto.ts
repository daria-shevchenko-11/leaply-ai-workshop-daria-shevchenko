// Hokuto Message Matrix API wrapper.
// Pulls live spend / ads_count / trend metrics from hokuto.leaplyhub.com
// to overlay on the FitMatrix component.
//
// Env vars (all optional — falls back to no-metrics mode if missing):
//   HOKUTO_API_BASE   — e.g. "https://hokuto.leaplyhub.com/api/v1"
//   HOKUTO_API_TOKEN  — Bearer token
//   HOKUTO_ACCOUNT    — account identifier, e.g. "A7_Leaply"
//
// Exact endpoint + auth scheme are best-guess until Daria confirms. The
// wrapper is designed to fail gracefully — any HTTP error or schema
// mismatch returns null and the UI falls back to local-only display.

import "server-only"
import { env } from "@/lib/env"

export type HokutoCellMetrics = {
  spend?: number // in $ for the time window
  ads_count?: number
  trend_pct?: number // percent change vs previous window
}

export type HokutoMatrix = {
  // Outer key: core_message_id, inner key: visual_format_id
  cells: Record<string, Record<string, HokutoCellMetrics>>
  totals?: {
    week_spend?: number
    profit?: number
    creatives?: number
    cells_active?: number
  }
  last_refreshed?: string
}

/**
 * Best-effort fetch of Hokuto matrix. Returns null on any failure —
 * never throws. Callers should treat null as "metrics unavailable".
 *
 * Tries common endpoint patterns to be resilient to unknown API shape:
 *   GET ${base}/message-matrix?account=${account}
 *   GET ${base}/matrix?account=${account}
 *
 * Once Daria confirms the actual endpoint, replace `CANDIDATE_PATHS`
 * with the correct one.
 */
export async function fetchHokutoMatrix(): Promise<HokutoMatrix | null> {
  const base = env.HOKUTO_API_BASE
  const token = env.HOKUTO_API_TOKEN
  const account = env.HOKUTO_ACCOUNT
  if (!base || !token) return null

  const CANDIDATE_PATHS = [
    `/message-matrix${account ? `?account=${encodeURIComponent(account)}` : ""}`,
    `/matrix${account ? `?account=${encodeURIComponent(account)}` : ""}`,
  ]

  for (const path of CANDIDATE_PATHS) {
    try {
      const url = `${base.replace(/\/$/, "")}${path}`
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        // Short timeout — UI fallback if Hokuto is slow
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue
      const json = (await res.json()) as unknown
      const parsed = parseHokutoResponse(json)
      if (parsed) return parsed
    } catch {
      // try next candidate
    }
  }
  return null
}

/**
 * Tolerant parser — accepts a few likely Hokuto response shapes and
 * normalizes to our HokutoMatrix type. If shape is alien, returns null.
 */
function parseHokutoResponse(raw: unknown): HokutoMatrix | null {
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>

  // Shape A: { cells: { [cmId]: { [vfId]: {...} } } }
  if (obj.cells && typeof obj.cells === "object") {
    return obj as HokutoMatrix
  }

  // Shape B: { rows: [{ core_message, cells: [{ visual_format, spend, ads_count, trend_pct }] }] }
  if (Array.isArray(obj.rows)) {
    const cells: HokutoMatrix["cells"] = {}
    for (const row of obj.rows as Array<Record<string, unknown>>) {
      const cmId = (row.core_message_id ?? row.core_message ?? row.id) as
        | string
        | undefined
      if (!cmId) continue
      const inner: Record<string, HokutoCellMetrics> = {}
      const rowCells = (row.cells ?? []) as Array<Record<string, unknown>>
      for (const c of rowCells) {
        const vfId = (c.visual_format_id ?? c.visual_format) as
          | string
          | undefined
        if (!vfId) continue
        inner[vfId] = {
          spend: typeof c.spend === "number" ? c.spend : undefined,
          ads_count: typeof c.ads_count === "number" ? c.ads_count : undefined,
          trend_pct: typeof c.trend_pct === "number" ? c.trend_pct : undefined,
        }
      }
      cells[cmId] = inner
    }
    return { cells }
  }

  return null
}

/** Compact metric display string: "$839K · 39 ads · ↗301%" */
export function formatCellMetrics(m: HokutoCellMetrics): string {
  const parts: string[] = []
  if (typeof m.spend === "number") parts.push(formatMoney(m.spend))
  if (typeof m.ads_count === "number") parts.push(`${m.ads_count} ads`)
  if (typeof m.trend_pct === "number") {
    const arrow = m.trend_pct >= 0 ? "↗" : "↘"
    parts.push(`${arrow}${Math.abs(m.trend_pct).toFixed(0)}%`)
  }
  return parts.join(" · ")
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}
