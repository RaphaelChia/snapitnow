"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Camera, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

function UserAvatar({
  src,
  name,
}: {
  src?: string | null;
  name?: string | null;
}) {
  if (src) {
    return (
      <Image
        src={src}
        width={32}
        height={32}
        alt={name ?? "User avatar"}
        className="size-8 rounded-full ring-1 ring-border"
        referrerPolicy="no-referrer"
      />
    );
  }

  const initial = name?.charAt(0)?.toUpperCase() ?? "?";
  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground ring-1 ring-border">
      {initial}
    </div>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm h-14">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Camera className="size-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            SnapItNow
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="size-8 animate-pulse rounded-full bg-muted" />
          ) : session?.user ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {session.user.name}
              </span>
              <UserAvatar src={session.user.image} name={session.user.name} />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                aria-label="Sign out"
              >
                <LogOut className="size-3.5" />
              </Button>
            </>
          ) : (
            <Button asChild variant="default" size="default">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}

export function GuestNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm h-14">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Camera className="size-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            SnapItNow
          </span>
        </Link>
      </nav>
    </header>
  );
}
