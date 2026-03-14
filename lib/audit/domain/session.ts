import "server-only"
import { logAuditEvent, type AuditActorType } from "@/lib/audit"
import { SESSION_AUDIT_EVENTS } from "@/lib/audit/events"
import type { Json } from "@/lib/db/types"

type SessionAuditInput = {
  sessionId: string
  actorType: AuditActorType
  actorId?: string | null
  metadata?: Json
}

export async function auditSessionCreated(input: SessionAuditInput): Promise<void> {
  await logAuditEvent({
    entityType: "session",
    entityId: input.sessionId,
    eventType: SESSION_AUDIT_EVENTS.CREATED,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: input.metadata,
  })
}

export async function auditSessionDeleted(input: SessionAuditInput): Promise<void> {
  await logAuditEvent({
    entityType: "session",
    entityId: input.sessionId,
    eventType: SESSION_AUDIT_EVENTS.DELETED,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: input.metadata,
  })
}

export async function auditSessionActivationCheckoutStarted(
  input: SessionAuditInput
): Promise<void> {
  await logAuditEvent({
    entityType: "session",
    entityId: input.sessionId,
    eventType: SESSION_AUDIT_EVENTS.ACTIVATION_CHECKOUT_STARTED,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: input.metadata,
  })
}

export async function auditSessionActivatedPaymentSucceeded(
  input: SessionAuditInput
): Promise<void> {
  await logAuditEvent({
    entityType: "session",
    entityId: input.sessionId,
    eventType: SESSION_AUDIT_EVENTS.ACTIVATED_PAYMENT_SUCCEEDED,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: input.metadata,
  })
}

export async function auditSessionEndedManual(input: SessionAuditInput): Promise<void> {
  await logAuditEvent({
    entityType: "session",
    entityId: input.sessionId,
    eventType: SESSION_AUDIT_EVENTS.ENDED_MANUAL,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: input.metadata,
  })
}

export async function auditSessionWeddingDateUpdated(
  input: SessionAuditInput
): Promise<void> {
  await logAuditEvent({
    entityType: "session",
    entityId: input.sessionId,
    eventType: SESSION_AUDIT_EVENTS.WEDDING_DATE_UPDATED,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: input.metadata,
  })
}

export async function auditSessionExpiredAdminForce(
  input: SessionAuditInput
): Promise<void> {
  await logAuditEvent({
    entityType: "session",
    entityId: input.sessionId,
    eventType: SESSION_AUDIT_EVENTS.EXPIRED_ADMIN_FORCE,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: input.metadata,
  })
}

export async function auditSessionReactivatedAdminForce(
  input: SessionAuditInput
): Promise<void> {
  await logAuditEvent({
    entityType: "session",
    entityId: input.sessionId,
    eventType: SESSION_AUDIT_EVENTS.REACTIVATED_ADMIN_FORCE,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: input.metadata,
  })
}
