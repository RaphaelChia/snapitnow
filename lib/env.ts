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

  // Guest OTP auth
  GUEST_TOKEN_SECRET: z.string().min(1).optional(),
  GUEST_OTP_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  GUEST_OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  GUEST_AUTH_SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(86400),

  // SMTP (transactional email)
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().email().optional(),
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

  return {
    ...result.data,
    GUEST_TOKEN_SECRET: result.data.GUEST_TOKEN_SECRET ?? result.data.AUTH_SECRET,
  }
}

export const env = validateEnv()
