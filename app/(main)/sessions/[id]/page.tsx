import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SessionDetail } from "./session-detail"

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  return <SessionDetail sessionId={id} />
}
