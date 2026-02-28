"use server"

import { auth } from "@/auth"
import { z } from "zod"
import { listHostSessions } from "@/lib/db/queries/sessions"
import { createSession, deleteSession } from "@/lib/db/mutations/sessions"
import type { Session } from "@/lib/db/types"

const createSessionSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  filter_mode: z.enum(["fixed", "preset"]),
  fixed_filter: z.string().nullable().optional(),
  allowed_filters: z.array(z.string()).nullable().optional(),
  roll_preset: z.number().refine((v) => [8, 12, 24, 36].includes(v), {
    message: "Roll preset must be 8, 12, 24, or 36",
  }),
  password: z.string().max(64).nullable().optional(),
})

export type CreateSessionFormData = z.infer<typeof createSessionSchema>

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export async function fetchHostSessions(): Promise<Session[]> {
  const userId = await getAuthenticatedUserId()
  return listHostSessions(userId)
}

export async function createNewSession(
  input: CreateSessionFormData
): Promise<Session> {
  const userId = await getAuthenticatedUserId()
  const parsed = createSessionSchema.parse(input)

  return createSession({
    host_id: userId,
    title: parsed.title,
    filter_mode: parsed.filter_mode,
    fixed_filter: parsed.fixed_filter ?? null,
    allowed_filters: parsed.allowed_filters ?? null,
    roll_preset: parsed.roll_preset,
    password_hash: parsed.password ?? null,
  })
}

export async function removeSession(sessionId: string): Promise<void> {
  const userId = await getAuthenticatedUserId()
  await deleteSession(sessionId, userId)
}
