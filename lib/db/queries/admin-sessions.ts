import "server-only"
import { createServerClient } from "../index"
import type { Database } from "../types"

export type AdminSessionFilters = {
  status?: "draft" | "active" | "expired" | "all"
  hostEmail?: string
  query?: string
  limit?: number
}

export type AdminSessionListItem = {
  session: Database["public"]["Tables"]["sessions"]["Row"]
  hostName: string | null
  hostEmail: string | null
}

async function resolveHostIdsForEmail(hostEmail: string): Promise<string[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from("hosts")
    .select("id")
    .ilike("email", `%${hostEmail}%`)
    .limit(100)

  if (error) throw error
  return (data ?? []).map((row) => row.id)
}

export async function listAdminSessions(
  filters: AdminSessionFilters = {}
): Promise<AdminSessionListItem[]> {
  const db = createServerClient()
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  let hostIdsForEmail: string[] | null = null
  if (filters.hostEmail && filters.hostEmail.trim().length > 0) {
    hostIdsForEmail = await resolveHostIdsForEmail(filters.hostEmail.trim())
    if (hostIdsForEmail.length === 0) {
      return []
    }
  }

  let query = db.from("sessions").select("*").order("created_at", { ascending: false }).limit(limit)

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  if (hostIdsForEmail) {
    query = query.in("host_id", hostIdsForEmail)
  }

  if (filters.query && filters.query.trim().length > 0) {
    const trimmed = filters.query.trim()
    query = query.or(`id.ilike.%${trimmed}%,title.ilike.%${trimmed}%`)
  }

  const { data: sessionRows, error } = await query
  if (error) throw error

  const sessions = sessionRows ?? []
  if (sessions.length === 0) return []
  const hostIds = Array.from(new Set(sessions.map((session) => session.host_id)))
  const { data: hostRows, error: hostError } = await db
    .from("hosts")
    .select("id,name,email")
    .in("id", hostIds)

  if (hostError) throw hostError
  const hostById = new Map((hostRows ?? []).map((host) => [host.id, host]))

  return sessions.map((session) => {
    const host = hostById.get(session.host_id)
    return {
      session,
      hostName: host?.name ?? null,
      hostEmail: host?.email ?? null,
    }
  })
}
