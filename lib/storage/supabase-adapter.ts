import "server-only"
import { createServerClient } from "@/lib/db"
import type { StorageService, UploadParams } from "./types"

export class SupabaseStorageAdapter implements StorageService {
  async upload({ bucket, objectKey, data, contentType }: UploadParams) {
    const db = createServerClient()
    const { error } = await db.storage
      .from(bucket)
      .upload(objectKey, data, { contentType, upsert: false })

    if (error) throw new Error(`Storage upload failed: ${error.message}`)
    return { objectKey }
  }

  async download(bucket: string, objectKey: string): Promise<Buffer> {
    const db = createServerClient()
    const { data, error } = await db.storage.from(bucket).download(objectKey)

    if (error) throw new Error(`Storage download failed: ${error.message}`)
    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async getSignedUrl(
    bucket: string,
    objectKey: string,
    expiresIn = 3600,
  ): Promise<string> {
    const db = createServerClient()
    const { data, error } = await db.storage
      .from(bucket)
      .createSignedUrl(objectKey, expiresIn)

    if (error) throw new Error(`Signed URL creation failed: ${error.message}`)
    return data.signedUrl
  }

  async delete(bucket: string, objectKey: string): Promise<void> {
    const db = createServerClient()
    const { error } = await db.storage.from(bucket).remove([objectKey])
    if (error) throw new Error(`Storage delete failed: ${error.message}`)
  }

  async deleteMany(bucket: string, objectKeys: string[]): Promise<void> {
    if (objectKeys.length === 0) return
    const db = createServerClient()
    const { error } = await db.storage.from(bucket).remove(objectKeys)
    if (error) throw new Error(`Storage bulk delete failed: ${error.message}`)
  }
}
