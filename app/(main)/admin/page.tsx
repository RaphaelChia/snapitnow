import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth/admin"
import { AdminDashboard } from "./portal"

export default async function AdminPage() {
  try {
    await requireAdmin()
  } catch {
    redirect("/")
  }

  return <AdminDashboard />
}
