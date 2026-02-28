import "server-only"
import type { StorageService } from "./types"
import { SupabaseStorageAdapter } from "./supabase-adapter"

let instance: StorageService | null = null

export function getStorageService(): StorageService {
  if (!instance) {
    instance = new SupabaseStorageAdapter()
  }
  return instance
}

export { BUCKET } from "./types"
export type { StorageService, UploadParams } from "./types"
