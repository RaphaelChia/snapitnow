import { GuestNavbar } from "@/components/navbar"

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <GuestNavbar />
      <div className="motion-safe-fade-up flex min-h-[calc(100dvh-4rem)] flex-col bg-linear-to-b from-background to-muted/20">
        {children}
      </div>
    </>
  )
}
