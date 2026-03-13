import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerClient } from "@/lib/db"
import { getSessionById } from "@/lib/db/queries/sessions"
import type { Database } from "@/lib/db/types"
import { env } from "@/lib/env"
import { createGuestOtpCode, hashGuestOtp } from "@/lib/guest-auth"
import { sendEmail } from "@/utils/emailer"
import { checkRateLimit } from "@/lib/rate-limit"

const requestOtpSchema = z.object({
  sessionId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().max(64).optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = requestOtpSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { sessionId, email, password } = parsed.data
    const ip = req.headers.get("x-forwarded-for") ?? "unknown"
    const limit = checkRateLimit(`otp-request:${ip}:${sessionId}`, 5, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      )
    }

    const session = await getSessionById(sessionId)
    if (!session || (session.status !== "active" && session.status !== "expired")) {
      return NextResponse.json({ error: "Session is not available" }, { status: 404 })
    }

    if (session.password_hash && session.password_hash !== (password ?? "")) {
      return NextResponse.json({ error: "Invalid session password" }, { status: 403 })
    }

    const otp = createGuestOtpCode()
    const expiresAt = new Date(Date.now() + env.GUEST_OTP_TTL_SECONDS * 1000).toISOString()
    const otpHash = hashGuestOtp(sessionId, email, otp)

    const db = createServerClient()
    const challengeInsert: Database["public"]["Tables"]["guest_auth_challenges"]["Insert"] = {
      session_id: sessionId,
      email: email.toLowerCase(),
      otp_hash: otpHash,
      expires_at: expiresAt,
    }

    const { error: insertError } = await db.from("guest_auth_challenges").insert(challengeInsert)

    if (insertError) throw insertError

    await sendEmail({
      to: email.toLowerCase(),
      subject: `Your SnapItNow code: ${otp}`,
      text: `Your SnapItNow code is ${otp}. It expires in ${Math.floor(env.GUEST_OTP_TTL_SECONDS / 60)} minutes.`,
      html: `<p>Your SnapItNow code is <strong>${otp}</strong>.</p><p>It expires in ${Math.floor(
        env.GUEST_OTP_TTL_SECONDS / 60,
      )} minutes.</p>`,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to request OTP:", error)
    return NextResponse.json({ error: "Failed to request OTP" }, { status: 500 })
  }
}
