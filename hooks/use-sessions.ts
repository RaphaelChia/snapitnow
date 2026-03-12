"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchHostSessions,
  fetchSession,
  createNewSession,
  removeSession,
  activateSessionForDev,
  createActivationCheckout,
  type CreateSessionFormData,
} from "@/app/(main)/sessions/actions"

export const sessionKeys = {
  all: ["sessions"] as const,
  list: () => [...sessionKeys.all, "list"] as const,
  detail: (id: string) => [...sessionKeys.all, "detail", id] as const,
}

export function useHostSessions() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: () => fetchHostSessions(),
  })
}

export function useSession(id: string) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => fetchSession(id),
    enabled: !!id,
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

export function useActivateSessionDev() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => activateSessionForDev(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() })
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) })
    },
  })
}

export function useCreateActivationCheckout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => createActivationCheckout(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() })
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) })
    },
  })
}
