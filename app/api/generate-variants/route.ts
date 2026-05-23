import { NextResponse } from "next/server"
import {
  GenerateVariantsRequestSchema,
  type VariantsResult,
} from "@/lib/schemas/hook-schemas"
import { generateTextVariants, generateCoverImage } from "@/lib/gemini"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { brief, analysis, generation_mode } =
      GenerateVariantsRequestSchema.parse(body)

    // 1. Generate text variants
    const textResult = await generateTextVariants(
      brief,
      analysis,
      generation_mode
    )

    // 2. For each variant, generate a cover image in parallel
    const variantsWithCovers = await Promise.all(
      textResult.variants.map(async (v) => {
        const coverPrompt = buildCoverPrompt(v)
        const coverUrl = await generateCoverImage(coverPrompt)
        return { ...v, cover_image_url: coverUrl }
      })
    )

    const result: VariantsResult = { variants: variantsWithCovers }
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function buildCoverPrompt(v: {
  hook_text: string
  ae_brief: string
  tags: { core_message_id: string; visual_format_id: string }
}): string {
  return `Generate a 9:16 vertical cover frame for an ad creative.
Hook text overlay: "${v.hook_text}"
Style brief: ${v.ae_brief}
Visual format tag: ${v.tags.visual_format_id}
Format: photorealistic, social-media native, sharp focus.
No watermarks, no logos.`
}
