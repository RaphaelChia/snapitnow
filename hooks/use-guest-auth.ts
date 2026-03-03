"use client"

import { useMutation } from "@tanstack/react-query"

export type RequestOtpInput = {
  sessionId: string
  email: string
  password?: string | null
}

export type VerifyOtpInput = {
  sessionId: string
  email: string
  otp: string
}

async function requestOtp(input: RequestOtpInput): Promise<void> {
  const res = await fetch("/api/guest/auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || "Failed to request OTP")
}

async function verifyOtp(input: VerifyOtpInput): Promise<void> {
  const res = await fetch("/api/guest/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || "Failed to verify OTP")
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: requestOtp,
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: verifyOtp,
  })
}
