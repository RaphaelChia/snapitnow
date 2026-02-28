"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchHostSessions,
  createNewSession,
  removeSession,
  type CreateSessionFormData,
} from "@/app/(main)/sessions/actions"

export const sessionKeys = {
  all: ["sessions"] as const,
  list: () => [...sessionKeys.all, "list"] as const,
}

export function useHostSessions() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: () => fetchHostSessions(),
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSessionFormData) => createNewSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() })
    },
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => removeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() })
    },
  })
}
