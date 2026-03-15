"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Heart, LogOut } from "lucide-react";
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
        width={36}
        height={36}
        alt={name ?? "User avatar"}
        className="size-9 rounded-full ring-1 ring-border/60 shadow-romance"
        referrerPolicy="no-referrer"
      />
    );
  }

  const initial = name?.charAt(0)?.toUpperCase() ?? "?";
  return (
    <div className="flex size-9 items-center justify-center rounded-full bg-romance-secondary text-sm font-medium text-romance-text ring-1 ring-border/60">
      {initial}
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex size-9 items-center justify-center rounded-xl bg-primary shadow-romance transition-transform duration-200 hover:scale-[1.02]">
      <Heart
        className="size-4 fill-primary-foreground text-primary-foreground"
        strokeWidth={2}
      />
    </div>
  );
}

export function MainNavbar() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            SnapItNow
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="size-9 animate-pulse rounded-full bg-muted" />
          ) : session?.user ? (
            <>
              {session.user.isAdmin && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.name}
              </span>
              <UserAvatar src={session.user.image} name={session.user.name} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/login" })}
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button asChild variant="default" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
