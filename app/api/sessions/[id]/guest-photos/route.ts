import { NextRequest, NextResponse } from "next/server"
import { getSessionById } from "@/lib/db/queries/sessions"
import { createServerClient } from "@/lib/db"
import type { GuestSession, Photo } from "@/lib/db/types"
import { getGuestAuthFromRequest } from "@/lib/guest-auth"
import { listGuestPhotos, listSessionPhotos } from "@/lib/db/queries/photos"
import { getStorageService, BUCKET } from "@/lib/storage"

type GuestPhotoWithUrl = Photo & {
  signedUrl: string | null
  thumbnailUrl: string | null
  isOwnPhoto: boolean
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params
    const guestAuth = getGuestAuthFromRequest(req, sessionId)
    if (!guestAuth) {
      return NextResponse.json({ error: "Guest authentication required" }, { status: 401 })
    }

    const session = await getSessionById(sessionId)
    if (!session || (session.status !== "active" && session.status !== "expired")) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const db = createServerClient()
    const { data: gsData, error: gsError } = await db
      .from("guest_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("guest_user_id", guestAuth.guestUserId)
      .single()

    if (gsError || !gsData) {
      return NextResponse.json({ error: "Guest session not found" }, { status: 404 })
    }

    const guestSession = gsData as unknown as GuestSession
    const unlockThreshold = Math.ceil(session.roll_preset / 2)
    const galleryUnlocked =
      session.status === "expired" || guestSession.shots_taken >= unlockThreshold

    const basePhotos = galleryUnlocked
      ? await listSessionPhotos(sessionId)
      : await listGuestPhotos(sessionId, guestAuth.guestUserId)

    const storage = getStorageService()
    const photos = await Promise.all(
      basePhotos
        .filter((photo) => photo.status === "uploaded" || photo.status === "processed")
        .map(async (photo): Promise<GuestPhotoWithUrl> => {
          const objectKey = photo.filtered_key ?? photo.object_key
          const [signedUrl, thumbnailUrl] = await Promise.all([
            storage.getSignedUrl(BUCKET, objectKey, 3600).catch(() => null),
            photo.thumbnail_key
              ? storage.getSignedUrl(BUCKET, photo.thumbnail_key, 3600).catch(() => null)
              : Promise.resolve(null),
          ])

          const isOwnPhoto = photo.guest_user_id === guestAuth.guestUserId
          return { ...photo, signedUrl, thumbnailUrl, isOwnPhoto }
        }),
    )

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        roll_preset: session.roll_preset,
        status: session.status,
      },
      visibility: {
        shotsTaken: guestSession.shots_taken,
        unlockThreshold,
        galleryUnlocked,
        scope: galleryUnlocked ? "all" : "own",
      },
      photos,
    })
  } catch (error) {
    console.error("Failed to fetch guest photos:", error)
    return NextResponse.json({ error: "Failed to fetch guest photos" }, { status: 500 })
  }
}
