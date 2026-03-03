import "server-only"
import { createHmac, randomInt } from "crypto"
import { NextRequest } from "next/server"
import { env } from "@/lib/env"

export const GUEST_AUTH_COOKIE = "snapit_guest_auth"

export type GuestAuthPayload = {
  sessionId: string
  guestUserId: string
  email: string
  exp: number
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url")
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8")
}

function sign(value: string): string {
  const secret = env.GUEST_TOKEN_SECRET ?? env.AUTH_SECRET
  return createHmac("sha256", secret).update(value).digest("base64url")
}

export function createGuestAuthToken(payload: GuestAuthPayload): string {
  const body = toBase64Url(JSON.stringify(payload))
  const signature = sign(body)
  return `${body}.${signature}`
}

export function verifyGuestAuthToken(token: string): GuestAuthPayload | null {
  const [body, signature] = token.split(".")
  if (!body || !signature) return null
  if (sign(body) !== signature) return null

  try {
    const payload = JSON.parse(fromBase64Url(body)) as GuestAuthPayload
    if (!payload?.sessionId || !payload?.guestUserId || !payload?.email) return null
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function getGuestAuthFromRequest(
  req: NextRequest,
  expectedSessionId?: string,
): GuestAuthPayload | null {
  const token = req.cookies.get(GUEST_AUTH_COOKIE)?.value
  if (!token) return null
  const payload = verifyGuestAuthToken(token)
  if (!payload) return null
  if (expectedSessionId && payload.sessionId !== expectedSessionId) return null
  return payload
}

export function createGuestOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

export function hashGuestOtp(sessionId: string, email: string, otp: string): string {
  const secret = env.GUEST_TOKEN_SECRET ?? env.AUTH_SECRET
  return createHmac("sha256", secret)
    .update(`${sessionId}:${email.toLowerCase()}:${otp}`)
    .digest("hex")
}
