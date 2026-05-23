import { NextResponse } from "next/server"
import { StartVideoRequestSchema } from "@/lib/schemas/hook-schemas"
import { submitVeoVideo } from "@/lib/gemini"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { variant } = StartVideoRequestSchema.parse(body)

    const prompt = buildVideoPrompt(variant)

    // Default: Veo via Gemini (single workshop key)
    // To swap to Kling: replace this with the Kling submit call.
    const operationName = await submitVeoVideo(prompt)

    return NextResponse.json({ job_id: operationName })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function buildVideoPrompt(variant: {
  hook_text: string
  ae_brief: string
  tags: { visual_format_id: string }
}): string {
  return `${variant.ae_brief}

On-screen text overlay (animate in over first 1.5 sec): "${variant.hook_text}"

Format: 9:16 vertical, 8 seconds, photorealistic, social-media native style. Visual format tag: ${variant.tags.visual_format_id}. Sound design subtle and supportive. No watermarks, no logos.`
}
