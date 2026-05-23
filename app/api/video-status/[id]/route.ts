import { NextResponse } from "next/server"
import { pollVeoVideo } from "@/lib/gemini"

export const runtime = "nodejs"
export const maxDuration = 15

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const operationName = decodeURIComponent(id)

    const result = await pollVeoVideo(operationName)

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
      { status: 200 } // Return 200 so client polling can read the error
    )
  }
}
