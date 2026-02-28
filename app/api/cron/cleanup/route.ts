import { NextRequest, NextResponse } from "next/server"
import { listExpiredPhotos } from "@/lib/db/queries/photos"
import { getStorageService, BUCKET } from "@/lib/storage"
import { createServerClient } from "@/lib/db"
import { env } from "@/lib/env"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const photos = await listExpiredPhotos()

    if (photos.length === 0) {
      return NextResponse.json({ deleted: 0 })
    }

    const storage = getStorageService()

    const objectKeys = photos.flatMap((p) => {
      const keys = [p.object_key]
      if (p.filtered_key) keys.push(p.filtered_key)
      if (p.thumbnail_key) keys.push(p.thumbnail_key)
      return keys
    })

    await storage.deleteMany(BUCKET, objectKeys)

    const db = createServerClient()
    const ids = photos.map((p) => p.id)
    const { error } = await db.from("photos").delete().in("id", ids)
    if (error) throw error

    return NextResponse.json({ deleted: photos.length })
  } catch (error) {
    console.error("Cleanup cron failed:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}
