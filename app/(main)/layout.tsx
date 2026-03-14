import { MainNavbar } from "@/components/navbar-main"
import { AuthProvider } from "@/lib/auth/provider"
import { QueryProvider } from "@/lib/query-provider"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <QueryProvider>
        <MainNavbar />
        <div className="motion-safe-fade-up flex min-h-[calc(100dvh-4rem)] flex-col bg-linear-to-b from-background to-muted/20">
          {children}
        </div>
      </QueryProvider>
    </AuthProvider>
  )
}
