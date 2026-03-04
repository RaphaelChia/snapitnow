import "server-only"
import { createServerClient } from "../index"
import type { Database } from "../types"

type HostRow = Database["public"]["Tables"]["hosts"]["Row"]
type HostInsertPayload = Database["public"]["Tables"]["hosts"]["Insert"]
type UpsertHostInput = Pick<HostInsertPayload, "id" | "email" | "name" | "image">

export async function upsertHost(host: UpsertHostInput): Promise<HostRow> {
  const db = createServerClient()
  const upsertPayload: HostInsertPayload = {
    id: host.id,
    email: host.email,
    name: host.name,
    image: host.image,
    last_login_at: new Date().toISOString(),
  }

  const { data: updatedHost, error: updateError } = await db
    .from("hosts")
    .upsert(upsertPayload, { onConflict: "email" })
    .select()
    .single()

  if (updateError) throw updateError
  return updatedHost as HostRow
}
