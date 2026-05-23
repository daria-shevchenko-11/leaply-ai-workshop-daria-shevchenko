import { NextResponse } from "next/server"
import { ProductionSheetRequestSchema } from "@/lib/schemas/hook-schemas"
import { generateProductionSheet } from "@/lib/gemini"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const apiKeyOverride = req.headers.get("x-google-ai-key") || undefined
    const body = await req.json()
    const parsed = ProductionSheetRequestSchema.parse(body)
    const sheet = await generateProductionSheet(parsed, apiKeyOverride)
    return NextResponse.json(sheet)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
