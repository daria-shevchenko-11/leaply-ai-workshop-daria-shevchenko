import { NextResponse } from "next/server"
import { fetchHokutoMatrix } from "@/lib/hokuto"

export const runtime = "nodejs"
export const maxDuration = 15

// Simple in-memory cache for 5 minutes — Hokuto data doesn't change frequently.
let cache: { matrix: unknown; at: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return NextResponse.json({ matrix: cache.matrix, cached: true })
    }
    const matrix = await fetchHokutoMatrix()
    cache = { matrix, at: Date.now() }
    return NextResponse.json({ matrix, cached: false })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hokuto fetch failed"
    return NextResponse.json({ matrix: null, error: msg }, { status: 200 })
  }
}
