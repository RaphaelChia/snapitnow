"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchHostSessions,
  fetchSession,
  createNewSession,
  removeSession,
  activateSessionForDev,
  createActivationCheckout,
  fetchActivationPricing,
  type CreateSessionFormData,
} from "@/app/(main)/sessions/actions"
import type { ActivationPricing } from "@/lib/payments/activation-pricing"

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
    mutationFn: ({ sessionId, rollPreset }: { sessionId: string; rollPreset: number }) =>
      createActivationCheckout(sessionId, rollPreset),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() })
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables.sessionId) })
    },
  })
}

export const pricingKeys = {
  tier: (rollPreset: number) => ["pricing", rollPreset] as const,
}

export function useActivationPricing(rollPreset: number) {
  return useQuery<ActivationPricing>({
    queryKey: pricingKeys.tier(rollPreset),
    queryFn: () => fetchActivationPricing(rollPreset),
    enabled: [8, 12, 24, 36].includes(rollPreset),
  })
}

