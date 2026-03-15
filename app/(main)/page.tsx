import { auth } from "@/auth"
import { Dashboard } from "./dashboard"
import { Landing } from "./landing"
import { listHostSessions } from "@/lib/db/queries/sessions"

export default async function HomePage() {
  const session = await auth()

  if (!session?.user) return <Landing />

  const sessions = await listHostSessions(session.user.id)
  return <Dashboard initialSessions={sessions} />
}
