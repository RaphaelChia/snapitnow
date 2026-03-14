"use server"

import { z } from "zod"
import { requireAdmin } from "@/lib/auth/admin"
import { listAdminSessions } from "@/lib/db/queries/admin-sessions"
import { listAdminPayments } from "@/lib/db/queries/admin-payments"
import { listAdminAuditEvents } from "@/lib/db/queries/admin-audit"
import {
  forceExpireSessionByAdmin,
  forceReactivateSessionByAdmin,
} from "@/lib/db/mutations/sessions"
import { getSessionById } from "@/lib/db/queries/sessions"
import {
  auditSessionExpiredAdminForce,
  auditSessionReactivatedAdminForce,
} from "@/lib/audit/domain/session"

const adminSessionFilterSchema = z.object({
  status: z.enum(["all", "draft", "active", "expired"]).optional(),
  hostEmail: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
})

const adminPaymentFilterSchema = z.object({
  status: z.string().optional(),
  paymentType: z.string().optional(),
  hostEmail: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  stripeLookup: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
})

const adminAuditFilterSchema = z.object({
  entityType: z.string().optional(),
  eventType: z.string().optional(),
  actorType: z.string().optional(),
  entityId: z.string().optional(),
  limit: z.number().int().min(1).max(300).optional(),
})

const adminSessionMutationSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.string().min(1).max(200),
})

export async function fetchAdminSessions(
  input: z.infer<typeof adminSessionFilterSchema> = {}
) {
  await requireAdmin()
  const filters = adminSessionFilterSchema.parse(input)
  return listAdminSessions(filters)
}

export async function fetchAdminPayments(
  input: z.infer<typeof adminPaymentFilterSchema> = {}
) {
  await requireAdmin()
  const filters = adminPaymentFilterSchema.parse(input)
  return listAdminPayments(filters)
}

export async function fetchAdminAuditEvents(
  input: z.infer<typeof adminAuditFilterSchema> = {}
) {
  await requireAdmin()
  const filters = adminAuditFilterSchema.parse(input)
  return listAdminAuditEvents(filters)
}

export async function adminForceExpireSession(input: {
  sessionId: string
  reason: string
}) {
  const { hostId } = await requireAdmin()
  const parsed = adminSessionMutationSchema.parse(input)
  const previous = await getSessionById(parsed.sessionId)
  if (!previous) {
    throw new Error("Session not found")
  }

  const updated = await forceExpireSessionByAdmin(parsed.sessionId)
  await auditSessionExpiredAdminForce({
    sessionId: updated.id,
    actorType: "admin",
    actorId: hostId,
    metadata: {
      reason: parsed.reason,
      fromStatus: previous.status,
      toStatus: updated.status,
      targetHostId: previous.host_id,
      endedAt: updated.ended_at,
      endReason: updated.end_reason,
    },
  })
  return updated
}

export async function adminForceReactivateSession(input: {
  sessionId: string
  reason: string
}) {
  const { hostId } = await requireAdmin()
  const parsed = adminSessionMutationSchema.parse(input)
  const previous = await getSessionById(parsed.sessionId)
  if (!previous) {
    throw new Error("Session not found")
  }

  const updated = await forceReactivateSessionByAdmin(parsed.sessionId)
  await auditSessionReactivatedAdminForce({
    sessionId: updated.id,
    actorType: "admin",
    actorId: hostId,
    metadata: {
      reason: parsed.reason,
      fromStatus: previous.status,
      toStatus: updated.status,
      targetHostId: previous.host_id,
      activatedAt: updated.activated_at,
    },
  })
  return updated
}
