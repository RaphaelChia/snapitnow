"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  adminCreateDiscount,
  adminDeleteDiscount,
  adminForceExpireSession,
  adminForceReactivateSession,
  adminUpdateDiscount,
  fetchAdminAuditEvents,
  fetchAdminDiscounts,
  fetchAdminPayments,
  fetchAdminSessions,
} from "@/app/(main)/admin/actions"

export const adminKeys = {
  all: ["admin"] as const,
  sessions: (filters: string) => [...adminKeys.all, "sessions", filters] as const,
  payments: (filters: string) => [...adminKeys.all, "payments", filters] as const,
  audit: (filters: string) => [...adminKeys.all, "audit", filters] as const,
  discounts: (filters: string) => [...adminKeys.all, "discounts", filters] as const,
}

type SessionFilterInput = Parameters<typeof fetchAdminSessions>[0]
type PaymentFilterInput = Parameters<typeof fetchAdminPayments>[0]
type AuditFilterInput = Parameters<typeof fetchAdminAuditEvents>[0]
type DiscountFilterInput = Parameters<typeof fetchAdminDiscounts>[0]

function stableKey(input: Record<string, unknown>): string {
  const entries = Object.entries(input).sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify(entries)
}

export function useAdminSessions(
  filters: SessionFilterInput = {},
  enabled: boolean = true
) {
  const key = stableKey(filters)
  return useQuery({
    queryKey: adminKeys.sessions(key),
    queryFn: () => fetchAdminSessions(filters),
    enabled,
  })
}

export function useAdminPayments(
  filters: PaymentFilterInput = {},
  enabled: boolean = true
) {
  const key = stableKey(filters)
  return useQuery({
    queryKey: adminKeys.payments(key),
    queryFn: () => fetchAdminPayments(filters),
    enabled,
  })
}

export function useAdminAudit(
  filters: AuditFilterInput = {},
  enabled: boolean = true
) {
  const key = stableKey(filters)
  return useQuery({
    queryKey: adminKeys.audit(key),
    queryFn: () => fetchAdminAuditEvents(filters),
    enabled,
  })
}

export function useAdminDiscounts(
  filters: DiscountFilterInput = {},
  enabled: boolean = true
) {
  const key = stableKey(filters)
  return useQuery({
    queryKey: adminKeys.discounts(key),
    queryFn: () => fetchAdminDiscounts(filters),
    enabled,
  })
}

export function useAdminForceExpireSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { sessionId: string; reason: string }) => adminForceExpireSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useAdminForceReactivateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { sessionId: string; reason: string }) => adminForceReactivateSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useAdminCreateDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof adminCreateDiscount>[0]) => adminCreateDiscount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useAdminUpdateDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof adminUpdateDiscount>[0]) => adminUpdateDiscount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useAdminDeleteDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof adminDeleteDiscount>[0]) => adminDeleteDiscount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}
