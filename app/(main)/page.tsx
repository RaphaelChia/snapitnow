import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Dashboard } from "./dashboard"
import { Landing } from "./landing"
import { listHostSessions } from "@/lib/db/queries/sessions"
import { cookies } from "next/headers"

export default async function HomePage() {
  const session = await auth()

  if (!session?.user) return <Landing />

  const cookieStore = await cookies()
  const pendingReferralCode = cookieStore.get("pending_referral_code")?.value
  if (pendingReferralCode) {
    redirect("/api/referrals/consume")
  }

  const sessions = await listHostSessions(session.user.id)
  return <Dashboard initialSessions={sessions} />
}
