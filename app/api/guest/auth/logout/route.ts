import { NextResponse } from "next/server"
import { GUEST_AUTH_COOKIE } from "@/lib/guest-auth"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: GUEST_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return res
}
