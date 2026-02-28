import "server-only"
import { createServerClient } from "../index"
import type { Host } from "../types"

export async function upsertHost(host: Omit<Host, "created_at">): Promise<Host> {
  const db = createServerClient()
  const { data, error } = await db
    .from("hosts")
    .upsert(
      {
        id: host.id,
        email: host.email,
        name: host.name,
        image: host.image,
      },
      { onConflict: "id" }
    )
    .select()
    .single()

  if (error) throw error
  return data as Host
}
