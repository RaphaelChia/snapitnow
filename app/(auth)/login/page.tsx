import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { LoginCard } from "./login-card"

export const metadata = {
  title: "Sign in - SnapItNow",
}

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/")

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <LoginCard />
    </main>
  )
}
