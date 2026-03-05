"use client"

import { useQuery } from "@tanstack/react-query"
import {
  fetchSessionPhotos,
  type PhotoWithUrl,
} from "@/app/(main)/sessions/actions"
import type { Photo } from "@/lib/db/types"

export const photoKeys = {
  all: ["photos"] as const,
  session: (sessionId: string) =>
    [...photoKeys.all, "session", sessionId] as const,
  guestSession: (sessionId: string) =>
    [...photoKeys.all, "guest-session", sessionId] as const,
}

export function useSessionPhotos(sessionId: string) {
  return useQuery<PhotoWithUrl[]>({
    queryKey: photoKeys.session(sessionId),
    queryFn: () => fetchSessionPhotos(sessionId),
    enabled: !!sessionId,
  })
}

export type GuestPhotoWithUrl = Photo & {
  signedUrl: string | null
  thumbnailUrl: string | null
}

export type GuestPhotoVisibility = {
  shotsTaken: number
  unlockThreshold: number
  galleryUnlocked: boolean
  scope: "own" | "all"
}

export type GuestSessionPhotosResponse = {
  session: {
    id: string
    title: string
    roll_preset: number
  }
  visibility: GuestPhotoVisibility
  photos: GuestPhotoWithUrl[]
}

async function fetchGuestSessionPhotos(
  sessionId: string,
): Promise<GuestSessionPhotosResponse> {
  const res = await fetch(`/api/sessions/${sessionId}/guest-photos`)
  if (res.status === 401) {
    throw new Error("UNAUTHORIZED")
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || "Failed to load guest photos")
  }
  return body as GuestSessionPhotosResponse
}

export function useGuestSessionPhotos(sessionId: string) {
  return useQuery<GuestSessionPhotosResponse>({
    queryKey: photoKeys.guestSession(sessionId),
    queryFn: () => fetchGuestSessionPhotos(sessionId),
    enabled: !!sessionId,
    refetchInterval: 10000,
  })
}
