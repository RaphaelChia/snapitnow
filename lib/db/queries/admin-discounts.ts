import "server-only"
import { createServerClient } from "../index"
import type { Database } from "../types"

export type AdminDiscountFilters = {
  rollPreset?: 8 | 12 | 24 | 36
  active?: "all" | "active" | "inactive"
  limit?: number
}

export type AdminDiscountListItem = Database["public"]["Tables"]["discounts"]["Row"]

export async function listAdminDiscounts(
  filters: AdminDiscountFilters = {}
): Promise<AdminDiscountListItem[]> {
  const db = createServerClient()
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200)

  let query = db
    .from("discounts")
    .select("*")
    .order("roll_preset", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (filters.rollPreset) {
    query = query.eq("roll_preset", filters.rollPreset)
  }

  if (filters.active === "active") {
    query = query.eq("active", true)
  } else if (filters.active === "inactive") {
    query = query.eq("active", false)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
