import "server-only"
import { auth } from "@/auth"
import { isHostAdmin } from "@/lib/db/queries/admin-users"

export type AdminContext = {
  hostId: string
  isAdmin: true
}

export async function requireAdmin(): Promise<AdminContext> {
  const session = await auth()
  const hostId = session?.user?.id
  if (!hostId) {
    throw new Error("Unauthorized")
  }

  const admin = await isHostAdmin(hostId)
  if (!admin) {
    throw new Error("Forbidden")
  }

  return { hostId, isAdmin: true }
}
