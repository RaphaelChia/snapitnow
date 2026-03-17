import { notFound } from "next/navigation"
import { getSessionById } from "@/lib/db/queries/sessions"
import { GuestEntryClient } from "./guest-entry-client"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>
}): Promise<Metadata> {
  const { sessionId } = await params
  const session = await getSessionById(sessionId)

  if (!session) {
    return {
      title: "Session not found",
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title: `${session.title} - Guest Access`,
    description: `Join ${session.title} on SnapItNow to capture and share moments with other guests.`,
    openGraph: {
      title: `${session.title} - Guest Access`,
      description: `Join ${session.title} on SnapItNow to capture and share moments with other guests.`,
      images: ["/og-default.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${session.title} - Guest Access`,
      description: `Join ${session.title} on SnapItNow to capture and share moments with other guests.`,
      images: ["/og-default.png"],
    },
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function GuestEntryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const session = await getSessionById(sessionId)

  if (!session) {
    notFound()
  }

  return (
    <GuestEntryClient
      sessionId={sessionId}
      title={session.title}
      status={session.status}
      requiresPassword={Boolean(session.password_hash)}
    />
  )
}
