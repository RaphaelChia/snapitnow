import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { claimReferralForHost } from "@/lib/db/mutations/referrals"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const pendingReferralCode = req.cookies.get("pending_referral_code")?.value
  if (pendingReferralCode) {
    try {
      await claimReferralForHost({
        hostId: session.user.id,
        referralCode: pendingReferralCode,
      })
    } catch (error) {
      console.error("Failed to consume pending referral code", error)
    }
  }

  const response = NextResponse.redirect(new URL("/", req.url))
  response.cookies.delete("pending_referral_code")
  return response
}
