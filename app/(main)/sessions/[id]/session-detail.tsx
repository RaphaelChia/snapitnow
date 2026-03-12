"use client";

import {
  useSession,
  useActivateSessionDev,
  useCreateActivationCheckout,
} from "@/hooks/use-sessions";
import { useSessionPhotos } from "@/hooks/use-photos";
import type { PhotoWithUrl } from "@/app/(main)/sessions/actions";
import { FILTER_PRESETS } from "@/lib/filters/presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Copy,
  Check,
  Film,
  Users,
  Lock,
  ImageIcon,
  QrCode,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  draft: "secondary",
  active: "default",
  expired: "destructive",
};

const statusLabel: Record<string, string> = {
  draft: "Getting ready",
  active: "Live",
  expired: "Ended",
};

function getFilterName(id: string): string {
  return FILTER_PRESETS.find((p) => p.id === id)?.name ?? id;
}

function getGuestUrl(sessionId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/s/${sessionId}`;
  }
  return `/s/${sessionId}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5"
    >
      {copied ? (
        <>
          <Check className="size-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          Copy link
        </>
      )}
    </Button>
  );
}

function ShareSection({ sessionId }: { sessionId: string }) {
  const guestUrl = getGuestUrl(sessionId);
  const [showQr, setShowQr] = useState(true);

  return (
    <Card className="motion-safe-fade-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="size-4" />
          Share with guests
        </CardTitle>
        <CardDescription>
          Guests can scan this QR code or open the link to join and capture
          moments.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono">
            {guestUrl}
          </div>
          <CopyButton text={guestUrl} />
        </div>

        {showQr && (
          <div className="flex justify-center rounded-lg  bg-white p-6">
            <QRCodeSVG
              value={guestUrl}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="self-center text-xs text-muted-foreground"
          onClick={() => setShowQr((v) => !v)}
        >
          {showQr ? "Hide QR code" : "Show QR code"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ConfigSummary({
  rollPreset,
  filterMode,
  fixedFilter,
  allowedFilters,
  hasPassword,
}: {
  rollPreset: number;
  filterMode: string;
  fixedFilter: string | null;
  allowedFilters: string[] | null;
  hasPassword: boolean;
}) {
  return (
    <Card className="motion-safe-fade-up" style={{ animationDelay: "60ms" }}>
      <CardHeader>
        <CardTitle className="text-base">Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Film className="size-3.5" />
            Moments per guest
          </div>
          <div className="font-medium">{rollPreset}</div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-3.5" />
            Filter mode
          </div>
          <div className="font-medium">
            {filterMode === "fixed" ? "One filter for all" : "Guests choose"}
          </div>

          {filterMode === "fixed" && fixedFilter && (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ImageIcon className="size-3.5" />
                Filter
              </div>
              <div className="font-medium">{getFilterName(fixedFilter)}</div>
            </>
          )}

          {filterMode === "preset" &&
            allowedFilters &&
            allowedFilters.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ImageIcon className="size-3.5" />
                  Filters
                </div>
                <div className="flex flex-wrap gap-1">
                  {allowedFilters.map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">
                      {getFilterName(f)}
                    </Badge>
                  ))}
                </div>
              </>
            )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="size-3.5" />
            Password
          </div>
          <div className="font-medium">
            {hasPassword ? "Protected" : "Open access"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PhotoCard({
  photo,
  index,
}: {
  photo: PhotoWithUrl;
  index: number;
}) {
  const url = photo.thumbnailUrl ?? photo.signedUrl;
  if (!url) return null;

  return (
    <div
      className="motion-safe-fade-up group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted shadow-romance transition-transform duration-200 hover:scale-[1.02]"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <img
        src={url}
        alt={`Photo by guest`}
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
        loading="lazy"
      />
      {photo.signedUrl && (
        <a
          href={photo.signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-sm">
            <Download className="size-4 text-foreground" />
          </div>
        </a>
      )}
      {photo.filter_used && (
        <div className="absolute bottom-1.5 left-1.5">
          <Badge
            variant="secondary"
            className="bg-black/50 text-[10px] text-white backdrop-blur-sm"
          >
            {getFilterName(photo.filter_used)}
          </Badge>
        </div>
      )}
    </div>
  );
}

function PhotoGallery({ sessionId }: { sessionId: string }) {
  const { data: photos, isLoading, error } = useSessionPhotos(sessionId);

  return (
    <Card className="motion-safe-fade-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="size-4" />
            Photos
            {photos && photos.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {photos.length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">Failed to load photos.</p>
        )}

        {photos && photos.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="motion-safe-float flex size-12 items-center justify-center rounded-xl bg-muted">
              <ImageIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No moments yet. Photos will appear here once guests start
              capturing.
            </p>
          </div>
        )}

        {photos && photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <PhotoCard key={photo.id} photo={photo} index={index} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const { data: session, isLoading, error } = useSession(sessionId);
  const activateDevMutation = useActivateSessionDev();
  const activationCheckoutMutation = useCreateActivationCheckout();
  const isDev = process.env.NODE_ENV !== "production";

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="flex flex-col gap-4">
          <div className="h-8 w-48 rounded shimmer-soft" />
          <div className="h-40 rounded-lg shimmer-soft" />
          <div className="h-64 rounded-lg shimmer-soft" />
        </div>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {error ? "Failed to load memory." : "Memory not found."}
          </p>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Back to memories
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <div className="motion-safe-fade-up mb-6 flex flex-col gap-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to memories
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {session.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Created {new Date(session.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge
            variant={statusVariant[session.status] ?? "secondary"}
            className="shrink-0"
          >
            {statusLabel[session.status] ?? session.status}
          </Badge>
        </div>

        {session.status === "draft" && (
          <div className="motion-safe-fade-up rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
            <p>
              This memory is <strong>getting ready</strong>. Guests can join
              once you activate it.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              disabled={activationCheckoutMutation.isPending}
              onClick={() => {
                activationCheckoutMutation.mutate(session.id, {
                  onSuccess: (result) => {
                    window.location.href = result.checkoutUrl;
                  },
                });
              }}
            >
              {activationCheckoutMutation.isPending
                ? "Redirecting to checkout..."
                : "Activate with Stripe"}
            </Button>
            {isDev && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={activateDevMutation.isPending}
                onClick={() => activateDevMutation.mutate(session.id)}
              >
                {activateDevMutation.isPending
                  ? "Activating..."
                  : "Activate session (Dev)"}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <ShareSection sessionId={sessionId} />

        <ConfigSummary
          rollPreset={session.roll_preset}
          filterMode={session.filter_mode}
          fixedFilter={session.fixed_filter}
          allowedFilters={session.allowed_filters}
          hasPassword={!!session.password_hash}
        />

        <PhotoGallery sessionId={sessionId} />
      </div>
    </main>
  );
}
