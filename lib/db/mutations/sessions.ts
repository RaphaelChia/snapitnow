import "server-only"
import { createServerClient } from "../index"
import type { Database, Session, FilterMode } from "../types"

export interface CreateSessionInput {
  host_id: string
  title: string
  password_hash?: string | null
  filter_mode: FilterMode
  fixed_filter?: string | null
  allowed_filters?: string[] | null
  roll_preset: number
  wedding_date_local: string
  event_timezone: string
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const db = createServerClient()
  const sessionInsert: Database["public"]["Tables"]["sessions"]["Insert"] = {
    host_id: input.host_id,
    title: input.title,
    password_hash: input.password_hash ?? null,
    filter_mode: input.filter_mode,
    fixed_filter: input.fixed_filter ?? null,
    allowed_filters: input.allowed_filters ?? null,
    roll_preset: input.roll_preset,
    wedding_date_local: input.wedding_date_local,
    event_timezone: input.event_timezone,
  }
  const { data, error } = await db
    .from("sessions")
    .insert(sessionInsert)
    .select()
    .single()

  if (error) throw error
  return data as Session
}

export async function deleteSession(sessionId: string, hostId: string): Promise<void> {
  const db = createServerClient()
  const { error } = await db
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("host_id", hostId)

  if (error) throw error
}

export async function updateSessionRollPreset(
  sessionId: string,
  hostId: string,
  rollPreset: number,
): Promise<Session> {
  const db = createServerClient()
  const { data, error } = await db
    .from("sessions")
    .update({ roll_preset: rollPreset })
    .eq("id", sessionId)
    .eq("host_id", hostId)
    .eq("status", "draft")
    .select("*")
    .single()

  if (error) throw error
  return data as Session
}

export async function activateSession(
  sessionId: string,
  hostId: string,
): Promise<Session> {
  const db = createServerClient()
  const activateUpdate: Database["public"]["Tables"]["sessions"]["Update"] = {
    status: "active",
    activated_at: new Date().toISOString(),
  }
  const { data, error } = await db
    .from("sessions")
    .update(activateUpdate)
    .eq("id", sessionId)
    .eq("host_id", hostId)
    .eq("status", "draft")
    .select("*")
    .single()

  if (error) throw error
  return data as Session
}

export async function endSessionByHost(
  sessionId: string,
  hostId: string,
): Promise<Session> {
  const db = createServerClient()
  const endUpdate: Database["public"]["Tables"]["sessions"]["Update"] = {
    status: "expired",
    ended_at: new Date().toISOString(),
    ended_by: "host",
    end_reason: "manual",
  }
  const { data, error } = await db
    .from("sessions")
    .update(endUpdate)
    .eq("id", sessionId)
    .eq("host_id", hostId)
    .eq("status", "active")
    .select("*")
    .single()

  if (error) throw error
  return data as Session
}

export async function forceExpireSessionByAdmin(sessionId: string): Promise<Session> {
  const db = createServerClient()
  const endUpdate: Database["public"]["Tables"]["sessions"]["Update"] = {
    status: "expired",
    ended_at: new Date().toISOString(),
    ended_by: "admin",
    end_reason: "admin_force_expire",
  }
  const { data, error } = await db
    .from("sessions")
    .update(endUpdate)
    .eq("id", sessionId)
    .in("status", ["draft", "active"])
    .select("*")
    .single()

  if (error) throw error
  return data as Session
}

export async function forceReactivateSessionByAdmin(sessionId: string): Promise<Session> {
  const db = createServerClient()
  const activateUpdate: Database["public"]["Tables"]["sessions"]["Update"] = {
    status: "active",
    activated_at: new Date().toISOString(),
    ended_at: null,
    ended_by: null,
    end_reason: null,
  }
  const { data, error } = await db
    .from("sessions")
    .update(activateUpdate)
    .eq("id", sessionId)
    .eq("status", "expired")
    .select("*")
    .single()

  if (error) throw error
  return data as Session
}

export async function updateWeddingDateOnce(
  sessionId: string,
  hostId: string,
  weddingDateLocal: string,
  eventTimezone: string,
): Promise<Session> {
  const db = createServerClient()
  const updatePayload: Database["public"]["Tables"]["sessions"]["Update"] = {
    wedding_date_local: weddingDateLocal,
    event_timezone: eventTimezone,
    wedding_date_update_count: 1,
  }
  const { data, error } = await db
    .from("sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .eq("host_id", hostId)
    .neq("status", "expired")
    .eq("wedding_date_update_count", 0)
    .select("*")
    .single()

  if (error) throw error
  return data as Session
}
