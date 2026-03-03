import { notFound } from "next/navigation"
import { getSessionById } from "@/lib/db/queries/sessions"
import { GuestEntryClient } from "./guest-entry-client"

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
