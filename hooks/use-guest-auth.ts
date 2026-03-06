"use client"

import { useMutation } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import type { GuestSession, Session } from "@/lib/db/types"

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

export type CameraInitResponse = {
  session: Pick<
    Session,
    | "id"
    | "title"
    | "filter_mode"
    | "fixed_filter"
    | "allowed_filters"
    | "roll_preset"
    | "status"
  >
  guestSession: Pick<GuestSession, "id" | "guest_user_id" | "shots_taken" | "shots_remaining">
}

export class GuestApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "GuestApiError"
    this.status = status
  }
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

async function fetchGuestCameraInit(sessionId: string): Promise<CameraInitResponse> {
  const res = await fetch(`/api/sessions/${sessionId}/camera-init`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new GuestApiError(body.error || "Failed to load session", res.status)
  }
  return body as CameraInitResponse
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

export function useGuestCameraInit(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: ["guestCameraInit", sessionId],
    queryFn: () => fetchGuestCameraInit(sessionId),
    enabled: Boolean(sessionId) && enabled,
    retry: false,
    staleTime: 0,
  })
}
