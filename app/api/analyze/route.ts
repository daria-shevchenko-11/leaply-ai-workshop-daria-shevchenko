import { NextResponse } from "next/server"
import { BriefSchema } from "@/lib/schemas/hook-schemas"
import { analyzeHook } from "@/lib/gemini"
import { findLinkedTasks } from "@/lib/fit-check"

export const runtime = "nodejs"
export const maxDuration = 60 // Vercel Hobby: 10s; Pro: 60s

export async function POST(req: Request) {
  try {
    const apiKeyOverride = req.headers.get("x-google-ai-key") || undefined
    const body = await req.json()
    const brief = BriefSchema.parse(body)

    const analysis = await analyzeHook(brief, apiKeyOverride)

    // Server-side augment linked_tasks from creative-tasks.json snapshot
    if (analysis.fit_check.status === "existing" && analysis.fit_check.mapped) {
      analysis.linked_tasks = findLinkedTasks(analysis.fit_check.mapped)
    } else {
      analysis.linked_tasks = []
    }

    return NextResponse.json(analysis)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
