import { NextRequest, NextResponse } from "next/server"
import { getSessionById } from "@/lib/db/queries/sessions"
import { createServerClient } from "@/lib/db"
import type { GuestSession } from "@/lib/db/types"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params
  const guestUserId = req.nextUrl.searchParams.get("guestUserId")

  if (!guestUserId) {
    return NextResponse.json({ error: "Missing guestUserId" }, { status: 400 })
  }

  const session = await getSessionById(sessionId)
  if (!session || session.status !== "active") {
    return NextResponse.json({ error: "Session not found or not active" }, { status: 404 })
  }

  const db = createServerClient()
  const { data: gsData, error } = await db
    .from("guest_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .eq("guest_user_id", guestUserId)
    .single()

  if (error || !gsData) {
    return NextResponse.json({ error: "Guest session not found" }, { status: 404 })
  }

  const guestSession = gsData as unknown as GuestSession

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      filter_mode: session.filter_mode,
      fixed_filter: session.fixed_filter,
      allowed_filters: session.allowed_filters,
      roll_preset: session.roll_preset,
      status: session.status,
    },
    guestSession: {
      id: guestSession.id,
      shots_taken: guestSession.shots_taken,
      shots_remaining: guestSession.shots_remaining,
    },
  })
}
