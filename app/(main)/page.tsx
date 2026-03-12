import { auth } from "@/auth"
import { Dashboard } from "./dashboard"
import { Landing } from "./landing"

export default async function HomePage() {
  const session = await auth()

  if (!session?.user) return <Landing />

  return <Dashboard />
}
