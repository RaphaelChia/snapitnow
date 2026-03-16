import "server-only"
import { createServerClient } from "../index"
import type { Database } from "../types"

type DiscountRow = Database["public"]["Tables"]["discounts"]["Row"]
type DiscountInsert = Database["public"]["Tables"]["discounts"]["Insert"]
type DiscountUpdate = Database["public"]["Tables"]["discounts"]["Update"]

export type CreateDiscountInput = {
  rollPreset: 8 | 12 | 24 | 36
  discountPercent: number
  label?: string | null
  active: boolean
}

export type UpdateDiscountInput = {
  id: string
  rollPreset?: 8 | 12 | 24 | 36
  discountPercent?: number
  label?: string | null
  active?: boolean
}

async function deactivateOtherActiveDiscounts(
  rollPreset: 8 | 12 | 24 | 36,
  currentDiscountId?: string
): Promise<void> {
  const db = createServerClient()
  let query = db
    .from("discounts")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("roll_preset", rollPreset)
    .eq("active", true)

  if (currentDiscountId) {
    query = query.neq("id", currentDiscountId)
  }

  const { error } = await query
  if (error) throw error
}

export async function createDiscount(input: CreateDiscountInput): Promise<DiscountRow> {
  if (input.active) {
    await deactivateOtherActiveDiscounts(input.rollPreset)
  }

  const db = createServerClient()
  const now = new Date().toISOString()
  const discountInsert: DiscountInsert = {
    roll_preset: input.rollPreset,
    discount_percent: input.discountPercent,
    label: input.label ?? null,
    active: input.active,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await db
    .from("discounts")
    .insert(discountInsert)
    .select("*")
    .single()

  if (error) throw error
  return data
}

export async function updateDiscount(input: UpdateDiscountInput): Promise<DiscountRow> {
  const db = createServerClient()
  const { data: existing, error: existingError } = await db
    .from("discounts")
    .select("id,roll_preset")
    .eq("id", input.id)
    .single()

  if (existingError) throw existingError

  const targetRollPreset = (input.rollPreset ?? existing.roll_preset) as 8 | 12 | 24 | 36
  if (input.active === true) {
    await deactivateOtherActiveDiscounts(targetRollPreset, input.id)
  }

  const updatePayload: DiscountUpdate = {
    updated_at: new Date().toISOString(),
  }

  if (input.rollPreset !== undefined) updatePayload.roll_preset = input.rollPreset
  if (input.discountPercent !== undefined) {
    updatePayload.discount_percent = input.discountPercent
  }
  if (input.label !== undefined) updatePayload.label = input.label
  if (input.active !== undefined) updatePayload.active = input.active

  const { data, error } = await db
    .from("discounts")
    .update(updatePayload)
    .eq("id", input.id)
    .select("*")
    .single()

  if (error) throw error
  return data
}

export async function deleteDiscount(discountId: string): Promise<void> {
  const db = createServerClient()
  const { error } = await db.from("discounts").delete().eq("id", discountId)
  if (error) throw error
}
