import "server-only"
import { createServerClient } from "../index"
import type { Database, Photo } from "../types"

export interface CreatePhotoInput {
  session_id: string
  host_id: string
  guest_user_id: string
  filter_used: string | null
  caption: string | null
}

export async function createPhotoRecord(input: CreatePhotoInput): Promise<Photo> {
  const db = createServerClient()

  const photoId = crypto.randomUUID()
  const objectKey = `sessions/${input.session_id}/raw/${photoId}.jpg`
  const photoInsert: Database["public"]["Tables"]["photos"]["Insert"] = {
    session_id: input.session_id,
    host_id: input.host_id,
    guest_user_id: input.guest_user_id,
    object_key: objectKey,
    filter_used: input.filter_used,
    caption: input.caption,
    status: "pending_upload",
    capture_committed_at: new Date().toISOString(),
    delete_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }

  const { data, error } = await db
    .from("photos")
    .insert(photoInsert)
    .select()
    .single()

  if (error) throw error
  return data as Photo
}

export async function markPhotoUploaded(photoId: string): Promise<void> {
  const db = createServerClient()
  const uploadUpdate: Database["public"]["Tables"]["photos"]["Update"] = {
    status: "uploaded",
    uploaded_at: new Date().toISOString(),
  }
  const { error } = await db
    .from("photos")
    .update(uploadUpdate)
    .eq("id", photoId)

  if (error) throw error
}

export async function markPhotoFailed(photoId: string): Promise<void> {
  const db = createServerClient()
  const failedUpdate: Database["public"]["Tables"]["photos"]["Update"] = {
    status: "failed",
  }
  const { error } = await db
    .from("photos")
    .update(failedUpdate)
    .eq("id", photoId)

  if (error) throw error
}

export async function markPhotoProcessed(
  photoId: string,
  filteredKey: string,
  thumbnailKey: string,
): Promise<void> {
  const db = createServerClient()
  const processedUpdate: Database["public"]["Tables"]["photos"]["Update"] = {
    status: "processed",
    filtered_key: filteredKey,
    thumbnail_key: thumbnailKey,
    processed_at: new Date().toISOString(),
  }
  const { error } = await db
    .from("photos")
    .update(processedUpdate)
    .eq("id", photoId)

  if (error) throw error
}
