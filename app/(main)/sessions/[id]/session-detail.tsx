"use client";

import {
  useSession,
  useActivateSessionDev,
  useCreateActivationCheckout,
  useActivationPricing,
  useDeleteSession,
  useEndSession,
  useUpdateWeddingDate,
} from "@/hooks/use-sessions";
import { useMyReferralOverview } from "@/hooks/use-referrals";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Printer,
  Maximize2,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Image from "next/image";
import { PhotoSlideshow } from "@/components/photo-slideshow";
import { ReferralShareCard } from "@/components/referral-share-card";
import {
  parseRollPreset,
  ROLL_PRESET_VALUES,
  type RollPreset,
} from "@/lib/domain/roll-presets";

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

function ShareSection({
  sessionId,
  sessionTitle,
  sessionPasscode,
}: {
  sessionId: string;
  sessionTitle: string;
  sessionPasscode?: string | null;
}) {
  const guestUrl = getGuestUrl(sessionId);
  const [showQr, setShowQr] = useState(true);
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const escapedPasscode = sessionPasscode
    ? sessionPasscode.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[char] ?? char;
    })
    : null;

  const openQrAsImage = useCallback(() => {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("");
    if (w) {
      w.document.write(
        `<img src="${dataUrl}" alt="QR Code" style="display:block;margin:2rem auto;" />`
      );
      w.document.title = "SnapItNow QR Code";
    }
  }, []);

  const openPrintTemplate = useCallback(() => {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const passcodeBlock = escapedPasscode
      ? `<div class="passcode">
  <div class="passcode-label">Passcode</div>
  <div class="passcode-value">${escapedPasscode}</div>
</div>`
      : "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document
      .write(`<!DOCTYPE html><html><head><title>QR Template - ${sessionTitle}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Source+Sans+3:wght@400;500&display=swap');
  body { font-family: 'Source Sans 3', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100svh; background: #fdf8f6; }
  .card { text-align: center; padding: 3rem 2.5rem; border: 2px solid #e8cfcf; border-radius: 1.25rem; background: #fff; max-width: 400px; width: 100%; }
  .title { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #2d2d2d; margin-bottom: 0.4rem; }
  .subtitle { color: #888; font-size: 0.95rem; margin-bottom: 1.5rem; }
  .qr { margin: 0 auto 1.5rem; }
  .qr img { width: 220px; height: 220px; }
  .passcode { margin-top: 0.75rem; }
  .passcode-label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  .passcode-value { margin-top: 0.25rem; font-size: 1.1rem; font-weight: 600; color: #2d2d2d; letter-spacing: 0.06em; }
  .url { font-size: 0.8rem; color: #aaa; word-break: break-all; margin-top: 0.5rem; }
  .brand { font-family: 'Playfair Display', serif; font-size: 0.75rem; color: #b76e79; margin-top: 1.5rem; letter-spacing: 0.05em; }
  @media print { body { background: #fff; } .card { border: 1px solid #ddd; box-shadow: none; } }
</style></head><body>
<div class="card">
  <div class="title">${sessionTitle}</div>
  <div class="subtitle">Scan to capture moments with us</div>
  <div class="qr"><img src="${dataUrl}" alt="QR Code" /></div>
  ${passcodeBlock}
  <div class="brand">SnapItNow</div>
</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`);
    w.document.close();
  }, [escapedPasscode, sessionTitle]);

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
          <div
            ref={qrCanvasRef}
            className="flex cursor-pointer justify-center rounded-lg bg-white p-6 transition-opacity hover:opacity-90"
            onClick={openQrAsImage}
            title="Click to open QR as image"
          >
            <QRCodeCanvas
              value={guestUrl}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowQr((v) => !v)}
          >
            {showQr ? "Hide QR code" : "Show QR code"}
          </Button>
          {showQr && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={openPrintTemplate}
            >
              <Printer className="mr-1 size-3" />
              Print template
            </Button>
          )}
        </div>
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
  weddingDateLocal,
  eventTimezone,
  canUpdateWeddingDate,
  weddingDateInputValue,
  isUpdatingWeddingDate,
  onWeddingDateInputChange,
  onWeddingDateSubmit,
}: {
  rollPreset: RollPreset;
  filterMode: string;
  fixedFilter: string | null;
  allowedFilters: string[] | null;
  hasPassword: boolean;
  weddingDateLocal: string | null;
  eventTimezone: string | null;
  canUpdateWeddingDate: boolean;
  weddingDateInputValue: string;
  isUpdatingWeddingDate: boolean;
  onWeddingDateInputChange: (value: string) => void;
  onWeddingDateSubmit: () => void;
}) {
  const [isEditingWeddingDate, setIsEditingWeddingDate] = useState(false);

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

          <div className="flex items-center gap-2 text-muted-foreground">
            <Film className="size-3.5" />
            Wedding date
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span>{weddingDateLocal ?? "Not set"}</span>
            {canUpdateWeddingDate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsEditingWeddingDate((prev) => !prev)}
                aria-label="Edit wedding date"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-3.5" />
            Event timezone
          </div>
          <div className="font-medium">{eventTimezone ?? "UTC"}</div>
        </div>

        {canUpdateWeddingDate && isEditingWeddingDate && (
          <div className="flex flex-col gap-1">
            <form
              className="mt-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onWeddingDateSubmit();
              }}
            >
              <Input
                id="weddingDateUpdate"
                type="date"
                value={weddingDateInputValue}
                onChange={(e) => onWeddingDateInputChange(e.target.value)}
                required
              />
              <Button
                type="submit"
                variant="outline"
                disabled={isUpdatingWeddingDate}
              >
                {isUpdatingWeddingDate ? "Saving..." : "Save date"}
              </Button>
            </form>
            <p className="px-1 text-xs text-muted-foreground">
              Wedding date can only be changed once after creation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PhotoCard({
  photo,
  index,
  onClick,
}: {
  photo: PhotoWithUrl;
  index: number;
  onClick?: () => void;
}) {
  const url = photo.thumbnailUrl ?? photo.signedUrl;
  if (!url) return null;

  return (
    <div
      className="motion-safe-fade-up group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-muted shadow-romance transition-transform duration-200 hover:scale-[1.02]"
      style={{ animationDelay: `${index * 45}ms` }}
      onClick={onClick}
    >
      <Image
        width={100}
        height={100}
        src={url}
        alt={photo.caption ?? "Photo by guest"}
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
        loading="lazy"
      />
      {photo.signedUrl && (
        <a
          href={photo.signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-sm">
            <Download className="size-4 text-foreground" />
          </div>
        </a>
      )}
      <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-0.5">
        {photo.filter_used && (
          <Badge
            variant="secondary"
            className="bg-black/50 text-[10px] text-white backdrop-blur-sm"
          >
            {getFilterName(photo.filter_used)}
          </Badge>
        )}
        {photo.caption && (
          <Badge
            variant="secondary"
            className="bg-black/50 text-[10px] text-white backdrop-blur-sm"
          >
            {photo.caption}
          </Badge>
        )}
      </div>
    </div>
  );
}

function PhotoGallery({ sessionId }: { sessionId: string }) {
  const { data: photos, isLoading, error } = useSessionPhotos(sessionId);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  const handleDownloadAll = useCallback(async () => {
    if (!photos || photos.length === 0 || isDownloading) return;
    setIsDownloading(true);

    try {
      const [{ default: JSZip }, { saveAs }] = await Promise.all([
        import("jszip"),
        import("file-saver"),
      ]);
      const zip = new JSZip();
      const batch = 5;
      let completed = 0;

      for (let i = 0; i < photos.length; i += batch) {
        const chunk = photos.slice(i, i + batch);
        await Promise.all(
          chunk.map(async (photo, j) => {
            if (!photo.signedUrl) return;
            const res = await fetch(photo.signedUrl);
            const blob = await res.blob();
            zip.file(`photo-${i + j + 1}.jpg`, blob);
            completed++;
            setDownloadProgress(`${completed}/${photos.length}`);
          })
        );
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `snapitnow-photos.zip`);
    } finally {
      setIsDownloading(false);
      setDownloadProgress("");
    }
  }, [photos, isDownloading]);

  const slideshowPhotos = (photos ?? []).filter((p) => p.signedUrl);

  return (
    <>
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
            {photos && photos.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => {
                    setSlideshowIndex(0);
                    setSlideshowOpen(true);
                  }}
                >
                  <Maximize2 className="size-3" />
                  Slideshow
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  disabled={isDownloading}
                  onClick={handleDownloadAll}
                >
                  <Download className="size-3" />
                  {isDownloading
                    ? `Downloading ${downloadProgress}`
                    : "Download all"}
                </Button>
              </div>
            )}
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
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  onClick={() => {
                    setSlideshowIndex(index);
                    setSlideshowOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PhotoSlideshow
        photos={slideshowPhotos}
        open={slideshowOpen}
        onOpenChange={setSlideshowOpen}
        initialIndex={slideshowIndex}
      />
    </>
  );
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function ConfirmActivationDialog({
  open,
  onOpenChange,
  sessionId,
  initialRollPreset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  initialRollPreset: RollPreset;
}) {
  const [selectedPreset, setSelectedPreset] = useState<RollPreset>(initialRollPreset);
  const pricingQuery = useActivationPricing(selectedPreset);
  const checkoutMutation = useCreateActivationCheckout();
  const pricing = pricingQuery.data;
  const isBusy = checkoutMutation.isPending;

  const handleProceed = useCallback(async () => {
    checkoutMutation.mutate(
      { sessionId, rollPreset: selectedPreset },
      {
        onSuccess: (result) => {
          window.location.href = result.checkoutUrl;
        },
      }
    );
  }, [selectedPreset, sessionId, checkoutMutation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm activation</DialogTitle>
          <DialogDescription>
            Review your session settings before proceeding to checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Moments per guest</Label>
            <div className="grid grid-cols-4 gap-2">
              {ROLL_PRESET_VALUES.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={selectedPreset === preset ? "default" : "outline"}
                  onClick={() => setSelectedPreset(preset)}
                  className="h-10 rounded-xl"
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          {pricing && (
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Base price</span>
                <span>
                  {formatCurrency(pricing.baseCents, pricing.currency)}
                </span>
              </div>
              {pricing.discountCents > 0 && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    {pricing.discountLabel ?? "Discount"}
                  </span>
                  <span className="text-green-600 dark:text-green-400">
                    -{formatCurrency(pricing.discountCents, pricing.currency)}
                  </span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>
                  {formatCurrency(pricing.finalCents, pricing.currency)}
                </span>
              </div>
            </div>
          )}

          {pricingQuery.isLoading && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 max-sm:gap-1">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button onClick={handleProceed} disabled={isBusy || !pricing}>
            {isBusy ? "Redirecting to checkout..." : "Proceed to checkout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { data: session, isLoading, error } = useSession(sessionId);
  const referralQuery = useMyReferralOverview();
  const activateDevMutation = useActivateSessionDev();
  const endSessionMutation = useEndSession();
  const deleteSessionMutation = useDeleteSession();
  const updateWeddingDateMutation = useUpdateWeddingDate();
  const isDev = process.env.NODE_ENV !== "production";
  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [weddingDateLocal, setWeddingDateLocal] = useState("");

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

  const weddingDateInputValue =
    weddingDateLocal || session.wedding_date_local || "";

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
          <>
            <div className="motion-safe-fade-up rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
              <p>
                This memory is <strong>getting ready</strong>. Guests can join
                after you activate this session through a one-time payment.
              </p>
              <p className="flex items-center gap-1.5">
                <Lock className="size-3.5" /> Secure checkout via Stripe.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                onClick={() => setActivationDialogOpen(true)}
              >
                Activate
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

            <ConfirmActivationDialog
              open={activationDialogOpen}
              onOpenChange={setActivationDialogOpen}
              sessionId={session.id}
              initialRollPreset={parseRollPreset(session.roll_preset)}
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-4">


        <ShareSection
          sessionId={sessionId}
          sessionTitle={session.title}
          sessionPasscode={session.password_hash}
        />

        <ConfigSummary
          rollPreset={parseRollPreset(session.roll_preset)}
          filterMode={session.filter_mode}
          fixedFilter={session.fixed_filter}
          allowedFilters={session.allowed_filters}
          hasPassword={!!session.password_hash}
          weddingDateLocal={session.wedding_date_local}
          eventTimezone={session.event_timezone}
          canUpdateWeddingDate={
            session.status !== "expired" &&
            session.wedding_date_update_count < 1
          }
          weddingDateInputValue={weddingDateInputValue}
          isUpdatingWeddingDate={updateWeddingDateMutation.isPending}
          onWeddingDateInputChange={setWeddingDateLocal}
          onWeddingDateSubmit={() =>
            updateWeddingDateMutation.mutate({
              sessionId: session.id,
              weddingDateLocal: weddingDateInputValue,
              eventTimezone: session.event_timezone ?? "UTC",
            })
          }
        />

        <PhotoGallery sessionId={sessionId} />
      </div>

      {session.status === "active" && (
        <div className="mt-6">
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={() => setEndDialogOpen(true)}
          >
            End session
          </Button>
        </div>
      )}

      {session.status !== "active" && (
        <div className="mt-6">
          <Button
            type="button"
            variant="destructive"
            className="w-full gap-2"
            disabled={deleteSessionMutation.isPending}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete memory
          </Button>
        </div>
      )}

      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>End this session?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Uploads will stop immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEndDialogOpen(false)}
              disabled={endSessionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={endSessionMutation.isPending}
              onClick={() =>
                endSessionMutation.mutate(sessionId, {
                  onSuccess: () => setEndDialogOpen(false),
                })
              }
            >
              {endSessionMutation.isPending ? "Ending..." : "End session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this memory?</DialogTitle>
            <DialogDescription>
              This cannot be undone. All photos and data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteSessionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteSessionMutation.isPending}
              onClick={() =>
                deleteSessionMutation.mutate(sessionId, {
                  onSuccess: () => router.push("/"),
                })
              }
            >
              {deleteSessionMutation.isPending ? "Deleting..." : "Delete memory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
