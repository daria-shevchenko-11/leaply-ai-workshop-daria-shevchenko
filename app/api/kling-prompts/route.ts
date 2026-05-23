import { NextResponse } from "next/server"
import {
  KlingPromptsRequestSchema,
  type KlingPromptsResponse,
} from "@/lib/schemas/hook-schemas"
import { generateKlingPrompts } from "@/lib/gemini"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const apiKeyOverride = req.headers.get("x-google-ai-key") || undefined
    const body = await req.json()
    const { variant, analysis } = KlingPromptsRequestSchema.parse(body)

    const prompts = await generateKlingPrompts(
      variant,
      analysis,
      apiKeyOverride
    )

    const result: KlingPromptsResponse = {
      variant_id: variant.id,
      prompts,
    }
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
