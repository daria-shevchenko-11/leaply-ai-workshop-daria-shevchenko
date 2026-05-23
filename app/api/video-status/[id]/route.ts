import { NextResponse } from "next/server"
import { pollVeoVideo } from "@/lib/gemini"
import { pollKlingPrediction } from "@/lib/replicate"
import { pollKlingDirect } from "@/lib/kling-direct"
import { env } from "@/lib/env"

export const runtime = "nodejs"
export const maxDuration = 15

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rawJobId = decodeURIComponent(id)

    // Route to right provider based on job_id prefix
    if (rawJobId.startsWith("kling-direct:")) {
      const taskId = rawJobId.slice("kling-direct:".length)
      const akOverride = req.headers.get("x-kling-access-key") || undefined
      const skOverride = req.headers.get("x-kling-secret-key") || undefined
      const ak = akOverride || env.KLING_ACCESS_KEY
      const sk = skOverride || env.KLING_SECRET_KEY
      if (!ak || !sk) {
        return NextResponse.json(
          {
            status: "failed",
            video_url: null,
            error:
              "Kling direct keys missing — provide via headers or env vars",
          },
          { status: 200 }
        )
      }
      const result = await pollKlingDirect(ak, sk, taskId)
      return NextResponse.json({
        status: !result.done
          ? "processing"
          : result.video_url
            ? "completed"
            : "failed",
        video_url: result.video_url,
        error: result.error,
      })
    }

    if (rawJobId.startsWith("replicate:")) {
      const predictionId = rawJobId.slice("replicate:".length)
      const replicateTokenOverride =
        req.headers.get("x-replicate-token") || undefined
      const token = replicateTokenOverride || env.REPLICATE_API_TOKEN
      if (!token) {
        return NextResponse.json(
          {
            status: "failed",
            video_url: null,
            error:
              "Replicate token missing — provide via x-replicate-token header or REPLICATE_API_TOKEN env",
          },
          { status: 200 }
        )
      }
      const result = await pollKlingPrediction(token, predictionId)
      return NextResponse.json({
        status: !result.done
          ? "processing"
          : result.video_url
            ? "completed"
            : "failed",
        video_url: result.video_url,
        error: result.error,
      })
    }

    // Veo path (job_id starts with "veo:" or — for backwards compat — no prefix)
    const opName = rawJobId.startsWith("veo:")
      ? rawJobId.slice("veo:".length)
      : rawJobId
    const result = await pollVeoVideo(opName)
    return NextResponse.json({
      status: !result.done
        ? "processing"
        : result.video_url
          ? "completed"
          : "failed",
      video_url: result.video_url,
      error: result.error,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json(
      { status: "failed", video_url: null, error: msg },
      { status: 200 }
    )
  }
}
