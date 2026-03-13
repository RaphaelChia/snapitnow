import "server-only"
import { createServerClient } from "../index"
import type { Database } from "../types"

export type AdminPaymentFilters = {
  status?: string
  paymentType?: string
  hostEmail?: string
  sessionId?: string
  stripeLookup?: string
  limit?: number
}

export type AdminPaymentListItem = {
  payment: Database["public"]["Tables"]["payments"]["Row"]
  hostName: string | null
  hostEmail: string | null
}

async function resolveHostIdsForEmail(hostEmail: string): Promise<string[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from("hosts")
    .select("id")
    .ilike("email", `%${hostEmail}%`)
    .limit(100)

  if (error) throw error
  return (data ?? []).map((row) => row.id)
}

export async function listAdminPayments(
  filters: AdminPaymentFilters = {}
): Promise<AdminPaymentListItem[]> {
  const db = createServerClient()
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  let hostIdsForEmail: string[] | null = null

  if (filters.hostEmail && filters.hostEmail.trim().length > 0) {
    hostIdsForEmail = await resolveHostIdsForEmail(filters.hostEmail.trim())
    if (hostIdsForEmail.length === 0) {
      return []
    }
  }

  let query = db.from("payments").select("*").order("created_at", { ascending: false }).limit(limit)

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }
  if (filters.paymentType && filters.paymentType !== "all") {
    query = query.eq("payment_type", filters.paymentType)
  }
  if (filters.sessionId && filters.sessionId.trim().length > 0) {
    query = query.eq("session_id", filters.sessionId.trim())
  }
  if (hostIdsForEmail) {
    query = query.in("host_id", hostIdsForEmail)
  }
  if (filters.stripeLookup && filters.stripeLookup.trim().length > 0) {
    const value = filters.stripeLookup.trim()
    query = query.or(
      `stripe_checkout_session_id.ilike.%${value}%,stripe_payment_intent_id.ilike.%${value}%`
    )
  }

  const { data: paymentRows, error } = await query
  if (error) throw error

  const payments = paymentRows ?? []
  if (payments.length === 0) return []

  const hostIds = Array.from(new Set(payments.map((payment) => payment.host_id)))
  const { data: hostRows, error: hostError } = await db
    .from("hosts")
    .select("id,name,email")
    .in("id", hostIds)

  if (hostError) throw hostError
  const hostById = new Map((hostRows ?? []).map((host) => [host.id, host]))

  return payments.map((payment) => {
    const host = hostById.get(payment.host_id)
    return {
      payment,
      hostName: host?.name ?? null,
      hostEmail: host?.email ?? null,
    }
  })
}
