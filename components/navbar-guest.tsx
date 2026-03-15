"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

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

export function GuestNavbar() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            SnapItNow
          </span>
        </Link>
      </nav>
    </header>
  );
}
