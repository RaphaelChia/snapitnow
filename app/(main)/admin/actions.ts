"use server"

import { z } from "zod"
import { requireAdmin } from "@/lib/auth/admin"
import { listAdminSessions } from "@/lib/db/queries/admin-sessions"
import { listAdminPayments } from "@/lib/db/queries/admin-payments"
import { listAdminAuditEvents } from "@/lib/db/queries/admin-audit"
import { listAdminDiscounts } from "@/lib/db/queries/admin-discounts"
import {
  forceExpireSessionByAdmin,
  forceReactivateSessionByAdmin,
} from "@/lib/db/mutations/sessions"
import {
  createDiscount,
  deleteDiscount,
  updateDiscount,
} from "@/lib/db/mutations/discounts"
import { ROLL_PRESET_VALUES } from "@/lib/domain/roll-presets"
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

const rollPresetSchema = z.union(
  ROLL_PRESET_VALUES.map((value) => z.literal(value)) as [
    z.ZodLiteral<8>,
    z.ZodLiteral<12>,
    z.ZodLiteral<24>,
    z.ZodLiteral<36>,
  ]
)

const adminDiscountFilterSchema = z.object({
  rollPreset: rollPresetSchema.optional(),
  active: z.enum(["all", "active", "inactive"]).optional(),
  limit: z.number().int().min(1).max(200).optional(),
})

const adminCreateDiscountSchema = z.object({
  rollPreset: rollPresetSchema,
  discountPercent: z.number().int().min(0).max(100),
  label: z.string().max(120).optional(),
  active: z.boolean(),
})

const adminUpdateDiscountSchema = z
  .object({
    id: z.string().uuid(),
    rollPreset: rollPresetSchema.optional(),
    discountPercent: z.number().int().min(0).max(100).optional(),
    label: z.string().max(120).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (input) =>
      input.rollPreset !== undefined ||
      input.discountPercent !== undefined ||
      input.label !== undefined ||
      input.active !== undefined,
    { message: "At least one discount field must be updated." }
  )

const adminDeleteDiscountSchema = z.object({
  id: z.string().uuid(),
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

export async function fetchAdminDiscounts(
  input: z.infer<typeof adminDiscountFilterSchema> = {}
) {
  await requireAdmin()
  const filters = adminDiscountFilterSchema.parse(input)
  return listAdminDiscounts(filters)
}

export async function adminCreateDiscount(
  input: z.infer<typeof adminCreateDiscountSchema>
) {
  await requireAdmin()
  const parsed = adminCreateDiscountSchema.parse(input)
  return createDiscount({
    rollPreset: parsed.rollPreset,
    discountPercent: parsed.discountPercent,
    label: parsed.label?.trim() ? parsed.label.trim() : null,
    active: parsed.active,
  })
}

export async function adminUpdateDiscount(
  input: z.infer<typeof adminUpdateDiscountSchema>
) {
  await requireAdmin()
  const parsed = adminUpdateDiscountSchema.parse(input)
  return updateDiscount({
    id: parsed.id,
    rollPreset: parsed.rollPreset,
    discountPercent: parsed.discountPercent,
    label:
      parsed.label === undefined
        ? undefined
        : parsed.label?.trim()
          ? parsed.label.trim()
          : null,
    active: parsed.active,
  })
}

export async function adminDeleteDiscount(
  input: z.infer<typeof adminDeleteDiscountSchema>
) {
  await requireAdmin()
  const parsed = adminDeleteDiscountSchema.parse(input)
  await deleteDiscount(parsed.id)
  return { success: true as const }
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
