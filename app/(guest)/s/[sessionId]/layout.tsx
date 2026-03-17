import { GuestNavbar } from "@/components/navbar-guest";
import { QueryProvider } from "@/lib/query-provider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guest Session",
  description: "Join a private SnapItNow session to capture and view shared event moments.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <GuestNavbar />
      <div className="motion-safe-fade-up flex min-h-[calc(100dvh-64px)] flex-col bg-linear-to-t from-background to-muted/20 ">
        {children}
      </div>
    </QueryProvider>
  );
}
