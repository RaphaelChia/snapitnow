import { NextRequest, NextResponse, after } from "next/server"
import { z } from "zod"
import { getSessionById } from "@/lib/db/queries/sessions"
import { createPhotoRecord, markPhotoUploaded, markPhotoFailed } from "@/lib/db/mutations/photos"
import { getStorageService, BUCKET } from "@/lib/storage"
import { createServerClient } from "@/lib/db"
import { processPhoto } from "@/lib/filters/process-photo"
import { FILTER_PRESETS, type FilterId } from "@/lib/filters/presets"
import type { GuestSession } from "@/lib/db/types"
import { getGuestAuthFromRequest } from "@/lib/guest-auth"

const uploadSchema = z.object({
  sessionId: z.string().uuid(),
  filterUsed: z.string().nullable(),
  caption: z.string().max(16).nullable(),
})
const KNOWN_FILTER_IDS = new Set(FILTER_PRESETS.map((preset) => preset.id))

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const parsed = uploadSchema.safeParse({
      sessionId: formData.get("sessionId"),
      filterUsed: formData.get("filterUsed") || null,
      caption: formData.get("caption") || null,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { sessionId, filterUsed, caption } = parsed.data
    const guestAuth = getGuestAuthFromRequest(req, sessionId)
    if (!guestAuth) {
      return NextResponse.json({ error: "Guest authentication required" }, { status: 401 })
    }
    const guestUserId = guestAuth.guestUserId

    const session = await getSessionById(sessionId)
    if (!session || session.status !== "active") {
      return NextResponse.json({ error: "Session not active" }, { status: 404 })
    }

    const selectedFilter = filterUsed ?? null
    let effectiveFilterUsed: FilterId
    if (session.filter_mode === "fixed") {
      const configuredFilter = session.fixed_filter ?? "none"
      if (!KNOWN_FILTER_IDS.has(configuredFilter as FilterId)) {
        return NextResponse.json({ error: "Session has an invalid configured filter" }, { status: 400 })
      }
      if (selectedFilter && selectedFilter !== configuredFilter) {
        return NextResponse.json({ error: "Filter is not allowed for this session" }, { status: 403 })
      }
      effectiveFilterUsed = configuredFilter as FilterId
    } else {
      const allowedFilters = session.allowed_filters ?? []
      if (allowedFilters.length === 0) {
        return NextResponse.json({ error: "Session has no available filters" }, { status: 403 })
      }
      const requestedFilter = selectedFilter ?? allowedFilters[0]
      if (!allowedFilters.includes(requestedFilter)) {
        return NextResponse.json({ error: "Filter is not allowed for this session" }, { status: 403 })
      }
      if (!KNOWN_FILTER_IDS.has(requestedFilter as FilterId)) {
        return NextResponse.json({ error: "Invalid filter selected" }, { status: 400 })
      }
      effectiveFilterUsed = requestedFilter as FilterId
    }

    const db = createServerClient()
    const { data: gsData, error: gsError } = await db
      .from("guest_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("guest_user_id", guestUserId)
      .single()

    if (gsError || !gsData) {
      return NextResponse.json({ error: "Guest session not found" }, { status: 404 })
    }

    const guestSession = gsData as unknown as GuestSession
    let reservedShot = false
    let photoId: string | null = null
    try {
      const { data: reserveRows, error: reserveError } = await db.rpc("reserve_guest_shot", {
        p_guest_session_id: guestSession.id,
      })
      if (reserveError) {
        throw reserveError
      }
      if (!reserveRows || reserveRows.length === 0) {
        return NextResponse.json({ error: "No shots remaining" }, { status: 403 })
      }
      reservedShot = true

      const photo = await createPhotoRecord({
        session_id: sessionId,
        host_id: session.host_id,
        guest_user_id: guestUserId,
        filter_used: effectiveFilterUsed,
        caption,
      })
      photoId = photo.id

      const storage = getStorageService()
      const buffer = Buffer.from(await file.arrayBuffer())

      await storage.upload({
        bucket: BUCKET,
        objectKey: photo.object_key,
        data: buffer,
        contentType: file.type || "image/jpeg",
      })

      await markPhotoUploaded(photo.id)

      after(async () => {
        await processPhoto(photo.id, photo.object_key, effectiveFilterUsed)
      })

      return NextResponse.json({
        photoId: photo.id,
        objectKey: photo.object_key,
      })
    } catch (uploadError) {
      if (photoId) {
        try {
          await markPhotoFailed(photoId)
        } catch (markFailedError) {
          console.error("Failed to mark photo as failed after upload error", {
            photoId,
            markFailedError,
          })
        }
      }
      if (reservedShot) {
        try {
          const { error: releaseError } = await db.rpc("release_guest_shot", {
            p_guest_session_id: guestSession.id,
          })
          if (releaseError) {
            console.error("Failed to release reserved shot after upload failure", {
              guestSessionId: guestSession.id,
              releaseError,
            })
          }
        } catch (releaseException) {
          console.error("Unexpected error releasing reserved shot after upload failure", {
            guestSessionId: guestSession.id,
            releaseException,
          })
        }
      }
      throw uploadError
    }
  } catch (error) {
    console.error("Photo upload failed:", error)
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    )
  }
}
