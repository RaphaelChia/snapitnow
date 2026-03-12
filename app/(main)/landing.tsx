"use client"

import Link from "next/link"
import { Heart, Camera, Users, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function Landing() {
  return (
    <main className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-romance-secondary/40 via-background to-background" />
      <div className="pointer-events-none absolute right-[-10%] top-[-15%] size-[500px] rounded-full bg-romance-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-10%] size-[400px] rounded-full bg-romance-accent/20 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="motion-safe-fade-up mb-6 flex size-16 items-center justify-center rounded-xl bg-primary shadow-romance">
          <Heart
            className="size-7 fill-primary-foreground text-primary-foreground"
            strokeWidth={2}
          />
        </div>

        <h1 className="motion-safe-fade-up mb-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Capture Every{" "}
          <span className="text-primary">Beautiful Moment</span>
        </h1>

        <p className="motion-safe-fade-up mb-8 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          A disposable-camera experience for your wedding. Guests snap filtered
          photos, and you get a gallery of authentic moments — all without an app
          download.
        </p>

        <div className="motion-safe-fade-up mb-10 flex items-center gap-3">
          <Button asChild size="lg" className="shadow-romance">
            <Link href="/login">Get started</Link>
          </Button>
        </div>

        <div className="motion-safe-fade-up grid w-full max-w-sm gap-4 text-left">
          <FeatureItem
            icon={Camera}
            title="Disposable camera feel"
            description="Fixed rolls and curated filters — just like the real thing."
          />
          <FeatureItem
            icon={Users}
            title="No app, no friction"
            description="Guests scan a QR code and start snapping in seconds."
          />
          <FeatureItem
            icon={Sparkles}
            title="Instant shared gallery"
            description="Everyone's photos in one beautiful, unlockable album."
          />
        </div>
      </div>
    </main>
  )
}
