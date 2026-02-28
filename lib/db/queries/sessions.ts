import "server-only"
import { createServerClient } from "../index"
import type { Session } from "../types"

export async function listHostSessions(hostId: string): Promise<Session[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as Session[]
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return (data as Session) ?? null
}
