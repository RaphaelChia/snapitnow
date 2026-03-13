import "server-only"
import { createServerClient } from "../index"
import type { Database } from "../types"

export type AdminAuditFilters = {
  entityType?: string
  eventType?: string
  actorType?: string
  entityId?: string
  limit?: number
}

export type AdminAuditEvent = Database["public"]["Tables"]["audit_events"]["Row"]

export async function listAdminAuditEvents(
  filters: AdminAuditFilters = {}
): Promise<AdminAuditEvent[]> {
  const db = createServerClient()
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 300)

  let query = db
    .from("audit_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit)

  if (filters.entityType && filters.entityType !== "all") {
    query = query.eq("entity_type", filters.entityType)
  }
  if (filters.eventType && filters.eventType !== "all") {
    query = query.eq("event_type", filters.eventType)
  }
  if (filters.actorType && filters.actorType !== "all") {
    query = query.eq("actor_type", filters.actorType)
  }
  if (filters.entityId && filters.entityId.trim().length > 0) {
    query = query.eq("entity_id", filters.entityId.trim())
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
