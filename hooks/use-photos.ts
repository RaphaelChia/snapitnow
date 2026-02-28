"use client"

import { useQuery } from "@tanstack/react-query"
import {
  fetchSessionPhotos,
  type PhotoWithUrl,
} from "@/app/(main)/sessions/actions"

export const photoKeys = {
  all: ["photos"] as const,
  session: (sessionId: string) =>
    [...photoKeys.all, "session", sessionId] as const,
}

export function useSessionPhotos(sessionId: string) {
  return useQuery<PhotoWithUrl[]>({
    queryKey: photoKeys.session(sessionId),
    queryFn: () => fetchSessionPhotos(sessionId),
    enabled: !!sessionId,
  })
}
