import "server-only"
import sharp from "sharp"
import { FILTER_PIPELINES } from "./server"
import type { FilterId } from "./presets"
import { getPhotoById } from "@/lib/db/queries/photos"
import { markPhotoProcessed, markPhotoFailed } from "@/lib/db/mutations/photos"
import { getStorageService, BUCKET } from "@/lib/storage"

export async function processPhoto(
  photoId: string,
  rawKey: string,
  filterUsed: string,
): Promise<void> {
  const storage = getStorageService()

  try {
    const photo = await getPhotoById(photoId)
    if (!photo) throw new Error(`Photo ${photoId} not found`)

    const rawBuffer = await storage.download(BUCKET, rawKey)

    const filterId = (filterUsed || "none") as FilterId
    const pipeline = FILTER_PIPELINES[filterId] ?? FILTER_PIPELINES["none"]

    let img = pipeline(sharp(rawBuffer))

    img = img
      .rotate()
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })

    const filteredBuffer = await img.toBuffer()

    const thumbBuffer = await sharp(filteredBuffer)
      .resize(400, 400, { fit: "inside" })
      .jpeg({ quality: 75 })
      .toBuffer()

    const filteredKey = rawKey.replace("/raw/", "/filtered/")
    const thumbKey = rawKey.replace("/raw/", "/thumbs/")

    await Promise.all([
      storage.upload({
        bucket: BUCKET,
        objectKey: filteredKey,
        data: filteredBuffer,
        contentType: "image/jpeg",
      }),
      storage.upload({
        bucket: BUCKET,
        objectKey: thumbKey,
        data: thumbBuffer,
        contentType: "image/jpeg",
      }),
    ])

    await markPhotoProcessed(photoId, filteredKey, thumbKey)
  } catch (error) {
    console.error(`Filter processing failed for photo ${photoId}:`, error)
    await markPhotoFailed(photoId).catch(() => {})
  }
}
