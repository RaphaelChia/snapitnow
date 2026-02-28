import { Navbar } from "@/components/navbar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
        {children}
      </div>
    </>
  )
}
