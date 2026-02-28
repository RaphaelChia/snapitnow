import "server-only"
import { createServerClient } from "../index"
import type { Session, FilterMode } from "../types"

export interface CreateSessionInput {
  host_id: string
  title: string
  password_hash?: string | null
  filter_mode: FilterMode
  fixed_filter?: string | null
  allowed_filters?: string[] | null
  roll_preset: number
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const db = createServerClient()
  const { data, error } = await db
    .from("sessions")
    .insert({
      host_id: input.host_id,
      title: input.title,
      password_hash: input.password_hash ?? null,
      filter_mode: input.filter_mode,
      fixed_filter: input.fixed_filter ?? null,
      allowed_filters: input.allowed_filters ?? null,
      roll_preset: input.roll_preset,
    })
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
