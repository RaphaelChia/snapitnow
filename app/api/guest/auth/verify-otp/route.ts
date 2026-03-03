import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerClient } from "@/lib/db"
import { getSessionById } from "@/lib/db/queries/sessions"
import { env } from "@/lib/env"
import {
  createGuestAuthToken,
  GUEST_AUTH_COOKIE,
  hashGuestOtp,
} from "@/lib/guest-auth"
import { checkRateLimit } from "@/lib/rate-limit"
import type { GuestAuthChallenge, GuestIdentity } from "@/lib/db/types"

const verifyOtpSchema = z.object({
  sessionId: z.string().uuid(),
  email: z.string().email(),
  otp: z.string().length(6),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = verifyOtpSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { sessionId, email, otp } = parsed.data
    const normalizedEmail = email.toLowerCase()
    const ip = req.headers.get("x-forwarded-for") ?? "unknown"
    const limit = checkRateLimit(
      `otp-verify:${ip}:${sessionId}:${normalizedEmail}`,
      10,
      10 * 60 * 1000,
    )
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      )
    }

    const session = await getSessionById(sessionId)
    if (!session || session.status !== "active") {
      return NextResponse.json({ error: "Session is not active" }, { status: 404 })
    }

    const db = createServerClient()
    const { data: challengeRows, error: challengeError } = await db
      .from("guest_auth_challenges")
      .select("*")
      .eq("session_id", sessionId)
      .eq("email", normalizedEmail)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)

    if (challengeError) throw challengeError
    const challenge = challengeRows?.[0] as GuestAuthChallenge | undefined

    if (!challenge || new Date(challenge.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
    }

    if (challenge.attempts >= env.GUEST_OTP_MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many OTP attempts" }, { status: 429 })
    }

    const expectedHash = hashGuestOtp(sessionId, normalizedEmail, otp)
    if (expectedHash !== challenge.otp_hash) {
      await db
        .from("guest_auth_challenges")
        .update({ attempts: challenge.attempts + 1 } as never)
        .eq("id", challenge.id)
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
    }

    const { data: consumedChallenge, error: consumedError } = await db
      .from("guest_auth_challenges")
      .update({ consumed_at: new Date().toISOString() } as never)
      .eq("id", challenge.id)
      .is("consumed_at", null)
      .select("*")
      .single()

    if (consumedError || !consumedChallenge) {
      return NextResponse.json({ error: "OTP already used" }, { status: 400 })
    }

    const { data: guestIdentity, error: identityError } = await db
      .from("guest_identities")
      .upsert(
        {
          email: normalizedEmail,
        } as never,
        { onConflict: "email" },
      )
      .select("*")
      .single()

    if (identityError) throw identityError
    const guest = guestIdentity as GuestIdentity

    const { error: guestSessionError } = await db
      .from("guest_sessions")
      .upsert(
        {
          session_id: sessionId,
          guest_user_id: guest.id,
          shots_taken: 0,
          shots_remaining: session.roll_preset,
          updated_at: new Date().toISOString(),
        } as never,
        {
          onConflict: "session_id,guest_user_id",
          ignoreDuplicates: true,
        },
      )

    if (guestSessionError) throw guestSessionError

    const nowSec = Math.floor(Date.now() / 1000)
    const token = createGuestAuthToken({
      sessionId,
      guestUserId: guest.id,
      email: guest.email,
      exp: nowSec + env.GUEST_AUTH_SESSION_TTL_SECONDS,
    })

    const res = NextResponse.json({ ok: true })
    res.cookies.set({
      name: GUEST_AUTH_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: env.GUEST_AUTH_SESSION_TTL_SECONDS,
    })
    return res
  } catch (error) {
    console.error("Failed to verify OTP:", error)
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 })
  }
}
