import { Navbar } from "@/components/navbar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-gradient-to-b from-background to-muted/20">
        {children}
      </div>
    </>
  )
}
