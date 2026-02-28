import { NextRequest, NextResponse } from "next/server"
import { getPhotoById } from "@/lib/db/queries/photos"
import { getSessionById } from "@/lib/db/queries/sessions"
import { getStorageService, BUCKET } from "@/lib/storage"
import { auth } from "@/auth"

export async function GET(req: NextRequest) {
  try {
    const photoId = req.nextUrl.searchParams.get("photoId")
    if (!photoId) {
      return NextResponse.json({ error: "Missing photoId" }, { status: 400 })
    }

    const photo = await getPhotoById(photoId)
    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const session = await auth()
    const hostId = session?.user?.id
    const guestUserId = req.nextUrl.searchParams.get("guestUserId")

    const photoSession = await getSessionById(photo.session_id)
    if (!photoSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const isHost = hostId === photoSession.host_id
    const isGuest = guestUserId && photo.guest_user_id === guestUserId
    if (!isHost && !isGuest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const objectKey = photo.filtered_key ?? photo.object_key
    const storage = getStorageService()
    const signedUrl = await storage.getSignedUrl(BUCKET, objectKey, 3600)

    return NextResponse.json({ url: signedUrl, status: photo.status })
  } catch (error) {
    console.error("Signed URL generation failed:", error)
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 })
  }
}
