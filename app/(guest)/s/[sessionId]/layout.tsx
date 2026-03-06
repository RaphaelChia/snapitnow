import { GuestNavbar } from "@/components/navbar"

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <GuestNavbar />
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">{children}</div>
    </>
  )
}
