"use server"

import { auth } from "@/auth"
import { ensureHostReferralCode } from "@/lib/db/mutations/referrals"
import { getReferralOverviewForHost } from "@/lib/db/queries/referrals"

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export async function fetchMyReferralOverview() {
  const hostId = await getAuthenticatedUserId()
  await ensureHostReferralCode(hostId)
  return getReferralOverviewForHost(hostId)
}
