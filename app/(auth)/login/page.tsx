import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { LoginCard } from "./login-card"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to manage your SnapItNow wedding sessions and guest photo galleries.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/")

  return (
    <main className="flex min-h-dvh items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-16 max-md:py-0">
      <LoginCard />
    </main>
  )
}
