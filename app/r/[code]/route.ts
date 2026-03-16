import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getActiveReferralCodeByValue } from "@/lib/db/queries/referrals"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params
  const session = await auth()
  const referralCode = await getActiveReferralCodeByValue(code)
  const destination = session?.user ? "/" : "/login"

  const response = NextResponse.redirect(new URL(destination, req.url))

  if (referralCode) {
    response.cookies.set("pending_referral_code", referralCode.code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    })
  }

  return response
}
