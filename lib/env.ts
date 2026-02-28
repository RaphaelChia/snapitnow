import { z } from "zod"

const envSchema = z.object({
  // Auth (NextAuth)
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Cron
  CRON_SECRET: z.string().min(1),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ✗ ${i.path.join(".")}: ${i.message}`)
      .join("\n")

    throw new Error(`Missing or invalid environment variables:\n${formatted}`)
  }

  return result.data
}

export const env = validateEnv()
