import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Camera } from "lucide-react"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary">
        <Camera className="size-8 text-primary-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">
          Welcome, {session.user.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your host dashboard is coming soon.
        </p>
      </div>
    </main>
  )
}
