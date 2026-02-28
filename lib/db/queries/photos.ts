import "server-only"
import { createServerClient } from "../index"
import type { Photo } from "../types"

export async function getPhotoById(photoId: string): Promise<Photo | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from("photos")
    .select("*")
    .eq("id", photoId)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return (data as unknown as Photo) ?? null
}

export async function listSessionPhotos(sessionId: string): Promise<Photo[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from("photos")
    .select("*")
    .eq("session_id", sessionId)
    .order("capture_committed_at", { ascending: true })

  if (error) throw error
  return data as Photo[]
}

export async function listGuestPhotos(
  sessionId: string,
  guestUserId: string,
): Promise<Photo[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from("photos")
    .select("*")
    .eq("session_id", sessionId)
    .eq("guest_user_id", guestUserId)
    .order("capture_committed_at", { ascending: true })

  if (error) throw error
  return data as Photo[]
}

export async function listExpiredPhotos(): Promise<Photo[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from("photos")
    .select("*")
    .lt("delete_after", new Date().toISOString())

  if (error) throw error
  return data as Photo[]
}
