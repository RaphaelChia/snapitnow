import "server-only"
import { recordAuditEvent } from "@/lib/db/mutations/audit-events"
import type { Json } from "@/lib/db/types"

export type AuditActorType = "host" | "admin" | "guest" | "system" | "cron" | "webhook"

type AuditMode = "required" | "best_effort"

export type AuditLogInput = {
  entityType: string
  entityId: string
  eventType: string
  actorType: AuditActorType
  actorId?: string | null
  requestId?: string | null
  correlationId?: string | null
  metadata?: Json
  mode?: AuditMode
}

export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  const mode = input.mode ?? "required"
  try {
    await recordAuditEvent({
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: input.eventType,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      requestId: input.requestId ?? null,
      correlationId: input.correlationId ?? null,
      metadata: input.metadata,
    })
  } catch (error) {
    if (mode === "best_effort") {
      console.error("Audit event dropped", {
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      return
    }
    throw error
  }
}
