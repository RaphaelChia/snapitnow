"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchMyReferralOverview } from "@/app/(main)/referrals/actions"

export const referralKeys = {
  all: ["referrals"] as const,
  me: () => [...referralKeys.all, "me"] as const,
}

export function useMyReferralOverview(enabled: boolean = true) {
  return useQuery({
    queryKey: referralKeys.me(),
    queryFn: () => fetchMyReferralOverview(),
    enabled,
  })
}
