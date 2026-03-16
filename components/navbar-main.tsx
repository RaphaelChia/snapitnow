"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Heart, LogOut, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMyReferralOverview } from "@/hooks/use-referrals";
import { ReferralShareCard } from "@/components/referral-share-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const referralQuery = useMyReferralOverview(!!session?.user);

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
              <Dialog
                open={referralDialogOpen}
                onOpenChange={setReferralDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="link"
                    className="hidden h-fit gap-1.5 p-0 sm:inline-flex"
                  >
                    <Megaphone className="size-3.5" />
                    Refer & save 15%
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share your referral code</DialogTitle>
                    <DialogDescription>
                      Share this with another couple, and they can enjoy 15% off their first order.
                    </DialogDescription>
                  </DialogHeader>
                  {referralQuery.data?.code ? (
                    <ReferralShareCard code={referralQuery.data.code} compact />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Preparing your referral code...
                    </p>
                  )}
                </DialogContent>
              </Dialog>
              {session.user.isAdmin && (
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              <div className="hidden sm:flex sm:flex-col sm:items-end sm:leading-tight">
                <span className="text-sm text-foreground">{session.user.name ?? "Account"}</span>
                {session.user.email ? (
                  <span className="text-xs text-muted-foreground">{session.user.email}</span>
                ) : null}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-auto rounded-full p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Open account menu"
                  >
                    <UserAvatar src={session.user.image} name={session.user.name} />
                  </Button>
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
                      onSelect={() => setReferralDialogOpen(true)}
                      className="gap-2"
                    >
                      <Megaphone className="size-4" />
                      Refer & save 15%
                    </DropdownMenuItem>
                    {session.user.isAdmin ? (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">Admin</Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                  </div>
                  <DropdownMenuItem
                    onSelect={() => signOut({ callbackUrl: "/login" })}
                    className="gap-2"
                  >
                    <LogOut className="size-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
