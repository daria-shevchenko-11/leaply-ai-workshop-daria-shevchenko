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
  GOOGLE_AI_API_KEY: z.string().min(1),

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
})

export const env = EnvSchema.parse(process.env)
export type Env = z.infer<typeof EnvSchema>
