import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"
import { env } from "@/lib/env"

export function createServerClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}
