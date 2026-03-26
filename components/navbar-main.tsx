"use client";

import { Button } from "@/components/ui/button";
import { Heart, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReferralShareDialog from "./referral-share-dialog";

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

export const AvatarWithMenu = () => {
  const { data: session, status } = useSession();
  if (status === "loading") return <div className="size-9 animate-pulse rounded-full bg-muted" />
  if (!session) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex flex-row-reverse cursor-pointer">
          <div className="hidden justify-center sm:flex sm:flex-col sm:items-start sm:leading-tight pl-2">
            <span className="text-sm text-foreground">{session.user.name ?? "Account"}</span>
            {session.user.email ? (
              <span className="text-xs text-muted-foreground">{session.user.email}</span>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-auto rounded-full p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open account menu"
          >
            <UserAvatar src={session.user.image} name={session.user.name} />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="sm:hidden">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">
              {session.user.name ?? "Account"}
            </span>
            {session.user.email ? (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {session.user.email}
              </span>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            asChild
            className="gap-2"
          >

            <ReferralShareDialog triggerClassName="px-2" />
          </DropdownMenuItem>
        </div>
        {session.user.isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">Admin</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => signOut({ callbackUrl: "/login" })}
          className="gap-2"
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
              <ReferralShareDialog triggerClassName="hidden sm:inline-flex" />
              <AvatarWithMenu />
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
