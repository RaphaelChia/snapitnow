import "server-only"
import { createServerClient } from "../index"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isMissingAdminUsersRelationError(error: unknown): boolean {
  if (!isRecord(error)) return false
  const code = Reflect.get(error, "code")
  const message = Reflect.get(error, "message")
  const details = Reflect.get(error, "details")
  const text = [code, message, details]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase()

  return (
    text.includes("admin_users") &&
    (text.includes("42p01") || text.includes("relation") || text.includes("could not find"))
  )
}

export async function isHostAdmin(hostId: string): Promise<boolean> {
  const db = createServerClient()
  const { data, error } = await db
    .from("admin_users")
    .select("id")
    .eq("host_id", hostId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (error) {
    // Allow host sign-in to continue before admin migrations are applied.
    if (isMissingAdminUsersRelationError(error)) return false
    throw error
  }
  return !!data
}
