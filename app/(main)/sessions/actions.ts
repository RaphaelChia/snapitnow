"use server"

import { auth } from "@/auth"
import { z } from "zod"
import { listHostSessions, getSessionById } from "@/lib/db/queries/sessions"
import { createSession, deleteSession } from "@/lib/db/mutations/sessions"
import { listSessionPhotos } from "@/lib/db/queries/photos"
import { getStorageService, BUCKET } from "@/lib/storage"
import type { Session, Photo } from "@/lib/db/types"

const createSessionSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100),
    filter_mode: z.enum(["fixed", "preset"]),
    fixed_filter: z.string().nullable().optional(),
    allowed_filters: z.array(z.string()).nullable().optional(),
    roll_preset: z.number().refine((v) => [8, 12, 24, 36].includes(v), {
      message: "Roll preset must be 8, 12, 24, or 36",
    }),
    password: z.string().max(64).nullable().optional(),
  })
  .refine(
    (d) =>
      d.filter_mode === "fixed"
        ? !!d.fixed_filter
        : (d.allowed_filters?.length ?? 0) >= 2,
    {
      message:
        "Fixed mode requires a filter selection; preset mode requires at least 2 filters",
    },
  )

export type CreateSessionFormData = z.infer<typeof createSessionSchema>

export type PhotoWithUrl = Photo & {
  signedUrl: string | null
  thumbnailUrl: string | null
}

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export async function fetchHostSessions(): Promise<Session[]> {
  const userId = await getAuthenticatedUserId()
  return listHostSessions(userId)
}

export async function fetchSession(sessionId: string): Promise<Session | null> {
  const userId = await getAuthenticatedUserId()
  const session = await getSessionById(sessionId)
  if (session && session.host_id !== userId) return null
  return session
}

export async function fetchSessionPhotos(
  sessionId: string,
): Promise<PhotoWithUrl[]> {
  const userId = await getAuthenticatedUserId()
  const session = await getSessionById(sessionId)
  if (!session || session.host_id !== userId) throw new Error("Unauthorized")

  const photos = await listSessionPhotos(sessionId)
  const storage = getStorageService()

  const withUrls = await Promise.all(
    photos
      .filter((p) => p.status === "uploaded" || p.status === "processed")
      .map(async (photo): Promise<PhotoWithUrl> => {
        const displayKey = photo.filtered_key ?? photo.object_key
        const thumbKey = photo.thumbnail_key

        const [signedUrl, thumbnailUrl] = await Promise.all([
          storage.getSignedUrl(BUCKET, displayKey, 3600).catch(() => null),
          thumbKey
            ? storage.getSignedUrl(BUCKET, thumbKey, 3600).catch(() => null)
            : Promise.resolve(null),
        ])

        return { ...photo, signedUrl, thumbnailUrl }
      }),
  )

  return withUrls
}

export async function createNewSession(
  input: CreateSessionFormData,
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
