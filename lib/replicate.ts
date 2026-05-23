// Replicate API wrapper for Kling video generation.
// Uses REST API directly (no SDK dep) to keep bundle minimal and stay
// resilient to model-slug changes.
//
// Auth: Token-based. Header `Authorization: Token <key>`.
// Endpoint: https://api.replicate.com/v1/...
//
// Job lifecycle:
//   1. POST /v1/models/{owner}/{name}/predictions  with { input: {...} }
//   2. Response: { id, status: 'starting'|'processing'|'succeeded'|'failed', urls: { get } }
//   3. Poll urls.get until status terminal
//   4. output (string|string[]) = video URL(s)

import "server-only"

// Default Kling model — Kuaishou's hosted image-to-video. Override via env if Replicate releases a newer slug.
const DEFAULT_KLING_MODEL =
  process.env.REPLICATE_KLING_MODEL || "kwaivgi/kling-v2.1-master"

type ReplicatePrediction = {
  id: string
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled"
  output?: string | string[] | null
  error?: string | null
  urls?: { get?: string; cancel?: string }
}

export type KlingSubmitInput = {
  prompt: string
  start_image?: string // URL or data: URL to first frame (Nano Banana cover)
  duration?: 5 | 10 // seconds; Kling v2 supports 5 and 10
  aspect_ratio?: "9:16" | "16:9" | "1:1"
  negative_prompt?: string
}

export async function submitKlingPrediction(
  token: string,
  input: KlingSubmitInput,
  model: string = DEFAULT_KLING_MODEL
): Promise<string> {
  const url = `https://api.replicate.com/v1/models/${model}/predictions`
  const body = {
    input: {
      prompt: input.prompt,
      ...(input.start_image ? { start_image: input.start_image } : {}),
      duration: input.duration ?? 5,
      aspect_ratio: input.aspect_ratio ?? "9:16",
      ...(input.negative_prompt
        ? { negative_prompt: input.negative_prompt }
        : {}),
    },
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=0", // async — don't block, return id immediately
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(
      `Replicate submit failed (${res.status}): ${txt.slice(0, 200)}`
    )
  }
  const json = (await res.json()) as ReplicatePrediction
  if (!json.id) throw new Error("Replicate did not return a prediction id")
  return json.id
}

export async function pollKlingPrediction(
  token: string,
  predictionId: string
): Promise<{
  done: boolean
  video_url: string | null
  error: string | null
  status: ReplicatePrediction["status"]
}> {
  const url = `https://api.replicate.com/v1/predictions/${predictionId}`
  const res = await fetch(url, {
    headers: { Authorization: `Token ${token}` },
  })
  if (!res.ok) {
    const txt = await res.text()
    return {
      done: true,
      video_url: null,
      error: `Replicate poll failed (${res.status}): ${txt.slice(0, 200)}`,
      status: "failed",
    }
  }
  const json = (await res.json()) as ReplicatePrediction

  if (json.status === "succeeded") {
    const output = Array.isArray(json.output)
      ? json.output[0]
      : (json.output ?? null)
    return {
      done: true,
      video_url: typeof output === "string" ? output : null,
      error: null,
      status: "succeeded",
    }
  }
  if (json.status === "failed" || json.status === "canceled") {
    return {
      done: true,
      video_url: null,
      error: json.error ?? `Prediction ${json.status}`,
      status: json.status,
    }
  }
  // still running
  return { done: false, video_url: null, error: null, status: json.status }
}
