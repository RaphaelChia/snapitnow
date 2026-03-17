import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth/admin"
import { AdminDashboard } from "./portal"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminPage() {
  try {
    await requireAdmin()
  } catch {
    redirect("/")
  }

  return <AdminDashboard />
}
