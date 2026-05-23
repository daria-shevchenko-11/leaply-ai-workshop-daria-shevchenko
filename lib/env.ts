import { z } from "zod"

// Parse and validate environment variables once at startup.
// Add a field here whenever you reference a new process.env.X in code.
// Required vars use .min(1) / .url() etc; optional vars use .optional().
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Google AI (Gemini 3.5 Flash + Nano Banana 2 image gen).
  // Used for hook analysis, transcription, text + image variant generation.
  // Workshop-provided keys available; pick one.
  // Optional at build time — API routes throw a helpful 500 if missing at runtime.
  GOOGLE_AI_API_KEY: z
    .preprocess(
      (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
      z.string().min(1).optional()
    )
    .optional(),

  // Replicate (Kling v2.x video generation).
  // Create at https://replicate.com → API tokens.
  // Requires billing topup (~$20 for testing).
  // Empty string treated as undefined.
  REPLICATE_API_TOKEN: z
    .preprocess(
      (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
      z.string().min(1).optional()
    )
    .optional(),

  // Hokuto Message Matrix (live spend / ads / trend metrics).
  // All three optional — if any missing, FitMatrix falls back to local
  // creative-tasks count display without live metrics.
  HOKUTO_API_BASE: z
    .preprocess(
      (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
      z.string().min(1).optional()
    )
    .optional(),
  HOKUTO_API_TOKEN: z
    .preprocess(
      (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
      z.string().min(1).optional()
    )
    .optional(),
  HOKUTO_ACCOUNT: z
    .preprocess(
      (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
      z.string().min(1).optional()
    )
    .optional(),

  // Kling AI direct API (api-singapore.klingai.com). Needs BOTH AK + SK
  // for JWT HS256 auth. Optional — falls back to Replicate-hosted Kling,
  // then to Veo via Gemini.
  KLING_ACCESS_KEY: z
    .preprocess(
      (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
      z.string().min(1).optional()
    )
    .optional(),
  KLING_SECRET_KEY: z
    .preprocess(
      (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
      z.string().min(1).optional()
    )
    .optional(),
})

export const env = EnvSchema.parse(process.env)
export type Env = z.infer<typeof EnvSchema>
