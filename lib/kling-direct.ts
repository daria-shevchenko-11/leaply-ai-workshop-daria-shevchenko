// Direct Kling AI API wrapper (api-singapore.klingai.com).
// Uses JWT HS256 auth — requires BOTH Access Key (AK) + Secret Key (SK).
//
// JWT spec per Kuaishou Kling Cloud docs:
//   header: { alg: "HS256", typ: "JWT" }
//   payload: { iss: AK, exp: nowSec + 1800, nbf: nowSec - 5 }
//   sign with SK using HMAC-SHA256
//
// Endpoints used:
//   POST /v1/videos/image2video → submit → { data: { task_id, task_status } }
//   GET  /v1/videos/image2video/{task_id} → poll → { task_status, task_result.videos[0].url }

import "server-only"
import { createHmac } from "node:crypto"

const KLING_BASE =
  process.env.KLING_API_BASE || "https://api-singapore.klingai.com"

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf-8") : buf
  return b
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

/** Build a short-lived JWT (30 min validity) per Kling auth spec. */
function buildJwt(accessKey: string, secretKey: string): string {
  const header = { alg: "HS256", typ: "JWT" }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: accessKey,
    exp: now + 1800,
    nbf: now - 5,
  }
  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${headerB64}.${payloadB64}`
  const sig = createHmac("sha256", secretKey).update(signingInput).digest()
  return `${signingInput}.${base64UrlEncode(sig)}`
}

export type KlingImage2VideoInput = {
  prompt: string
  image_url?: string
  duration?: 5 | 10
  aspect_ratio?: "9:16" | "16:9" | "1:1"
  negative_prompt?: string
  cfg_scale?: number
}

type KlingTaskResponse = {
  code?: number
  message?: string
  data?: {
    task_id?: string
    task_status?:
      | "submitted"
      | "processing"
      | "succeed"
      | "failed"
      | "succeeded"
    task_status_msg?: string
    task_result?: {
      videos?: Array<{ id?: string; url?: string; duration?: string }>
    }
  }
}

export async function submitKlingDirect(
  accessKey: string,
  secretKey: string,
  input: KlingImage2VideoInput
): Promise<string> {
  const jwt = buildJwt(accessKey, secretKey)
  const url = `${KLING_BASE}/v1/videos/image2video`
  const body = {
    model_name: "kling-v2-1-master",
    prompt: input.prompt,
    ...(input.image_url ? { image: input.image_url } : {}),
    ...(input.negative_prompt
      ? { negative_prompt: input.negative_prompt }
      : {}),
    duration: String(input.duration ?? 5),
    aspect_ratio: input.aspect_ratio ?? "9:16",
    cfg_scale: input.cfg_scale ?? 0.5,
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Kling submit ${res.status}: ${txt.slice(0, 200)}`)
  }
  const json = (await res.json()) as KlingTaskResponse
  const taskId = json.data?.task_id
  if (!taskId) {
    throw new Error(
      `Kling submit returned no task_id: ${JSON.stringify(json).slice(0, 200)}`
    )
  }
  return taskId
}

export async function pollKlingDirect(
  accessKey: string,
  secretKey: string,
  taskId: string
): Promise<{
  done: boolean
  video_url: string | null
  error: string | null
}> {
  const jwt = buildJwt(accessKey, secretKey)
  const url = `${KLING_BASE}/v1/videos/image2video/${encodeURIComponent(taskId)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  })
  if (!res.ok) {
    const txt = await res.text()
    return {
      done: true,
      video_url: null,
      error: `Kling poll ${res.status}: ${txt.slice(0, 200)}`,
    }
  }
  const json = (await res.json()) as KlingTaskResponse
  const status = json.data?.task_status
  if (status === "succeed" || status === "succeeded") {
    const videoUrl = json.data?.task_result?.videos?.[0]?.url ?? null
    return { done: true, video_url: videoUrl, error: null }
  }
  if (status === "failed") {
    return {
      done: true,
      video_url: null,
      error: json.data?.task_status_msg ?? "Kling task failed",
    }
  }
  return { done: false, video_url: null, error: null }
}
