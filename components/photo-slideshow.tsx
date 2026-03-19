"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Play, Pause } from "lucide-react";
import { VisuallyHidden } from "radix-ui";

interface SlideshowPhoto {
  id: string;
  signedUrl: string | null;
  caption?: string | null;
}

interface PhotoSlideshowProps {
  photos: SlideshowPhoto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
}

const PRELOAD_RADIUS = 5;
const AUTO_PLAY_INTERVAL_MS = 3000;
const AUTO_PLAY_READY_CHECK_MS = 200;

export function PhotoSlideshow({
  photos,
  open,
  onOpenChange,
  initialIndex = 0,
}: PhotoSlideshowProps) {
  const [indexOffset, setIndexOffset] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const preloadingUrlsRef = useRef(new Set<string>());

  const count = photos.length;

  const getWrappedIndex = useCallback(
    (value: number) => {
      if (count === 0) return 0;
      return ((value % count) + count) % count;
    },
    [count]
  );

  const index = useMemo(
    () => getWrappedIndex(initialIndex + indexOffset),
    [getWrappedIndex, indexOffset, initialIndex]
  );
  const current = photos[index];
  const currentUrl = current?.signedUrl ?? null;
  const currentLoaded = Boolean(currentUrl && loadedUrls.has(currentUrl));

  const markLoaded = useCallback((url: string) => {
    setLoadedUrls((currentLoadedUrls) => {
      if (currentLoadedUrls.has(url)) return currentLoadedUrls;
      const nextLoadedUrls = new Set(currentLoadedUrls);
      nextLoadedUrls.add(url);
      return nextLoadedUrls;
    });
    preloadingUrlsRef.current.delete(url);
  }, []);

  const preloadUrl = useCallback(
    (url: string | null | undefined) => {
      if (!url) return;
      if (loadedUrls.has(url) || preloadingUrlsRef.current.has(url)) return;

      preloadingUrlsRef.current.add(url);

      const image = new window.Image();
      image.onload = () => {
        markLoaded(url);
      };
      image.onerror = () => {
        preloadingUrlsRef.current.delete(url);
      };
      image.src = url;
    },
    [loadedUrls, markLoaded]
  );

  const preloadAtIndex = useCallback(
    (targetIndex: number) => {
      const targetUrl = photos[getWrappedIndex(targetIndex)]?.signedUrl;
      preloadUrl(targetUrl);
    },
    [getWrappedIndex, photos, preloadUrl]
  );

  const isIndexLoaded = useCallback(
    (targetIndex: number) => {
      const targetUrl = photos[getWrappedIndex(targetIndex)]?.signedUrl;
      if (!targetUrl) return false;
      return loadedUrls.has(targetUrl);
    },
    [getWrappedIndex, loadedUrls, photos]
  );

  const preloadNeighborIndices = useMemo(() => {
    if (count <= 1) return [];

    const indices: number[] = [];
    for (let step = 1; step <= PRELOAD_RADIUS; step += 1) {
      indices.push(getWrappedIndex(index + step));
      indices.push(getWrappedIndex(index - step));
    }
    return indices;
  }, [count, getWrappedIndex, index]);

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setIndexOffset((offset) => offset + 1);
  }, [count]);

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    setIndexOffset((offset) => offset - 1);
  }, [count]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setAutoPlay(false);
        setTouchStartX(null);
        setIndexOffset(0);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!open || count === 0 || !currentUrl) return;
    preloadUrl(currentUrl);
  }, [count, currentUrl, open, preloadUrl]);

  useEffect(() => {
    if (!open || preloadNeighborIndices.length === 0) return;

    for (const targetIndex of preloadNeighborIndices) {
      preloadAtIndex(targetIndex);
    }
  }, [open, preloadAtIndex, preloadNeighborIndices]);

  useEffect(() => {
    if (!open || !autoPlay || count <= 1) return;

    let readyCheckTimer: number | null = null;

    const waitForNextPhoto = () => {
      const nextIndex = getWrappedIndex(index + 1);
      if (isIndexLoaded(nextIndex)) {
        goNext();
        return;
      }

      preloadAtIndex(nextIndex);
      readyCheckTimer = window.setTimeout(
        waitForNextPhoto,
        AUTO_PLAY_READY_CHECK_MS
      );
    };

    const advanceTimer = window.setTimeout(
      waitForNextPhoto,
      AUTO_PLAY_INTERVAL_MS
    );

    return () => {
      window.clearTimeout(advanceTimer);
      if (readyCheckTimer !== null) {
        window.clearTimeout(readyCheckTimer);
      }
    };
  }, [
    autoPlay,
    count,
    getWrappedIndex,
    goNext,
    index,
    isIndexLoaded,
    open,
    preloadAtIndex,
  ]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goNext, goPrev, onOpenChange]);

  if (!current?.signedUrl) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTitle style={{ ...VisuallyHidden.VISUALLY_HIDDEN_STYLES }}>
        Photo Slideshow
      </DialogTitle>
      <DialogContent className="flex h-[100dvh] w-[100dvw] max-w-[100dvw] flex-col gap-0 overflow-hidden border-none bg-black/95 p-0 sm:h-[100dvh] sm:w-[100dvw] sm:max-w-[100dvw] lg:w-[100dvw] lg:max-w-[100dvw] xl:w-[100dvw] xl:max-w-[100dvw] sm:rounded-2xl [&>button]:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-white/70">
            {index + 1} / {count}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setAutoPlay((v) => !v)}
            >
              {autoPlay ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => handleOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-5 sm:px-10 sm:pb-8"
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 50) {
              if (dx < 0) {
                goNext();
              } else {
                goPrev();
              }
            }
            setTouchStartX(null);
          }}
        >
          {count > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 z-10 text-white/60 hover:bg-white/10 hover:text-white sm:left-4"
              onClick={goPrev}
            >
              <ChevronLeft className="size-6" />
            </Button>
          )}

          <div className="relative w-[min(86vw,760px)] rounded-[2px] border border-zinc-200 bg-white p-3 pb-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:p-4 sm:pb-8">
            <div className="relative h-[min(62dvh,62vw)] w-full overflow-hidden bg-zinc-100">
              <Image
                src={current.signedUrl}
                alt={current.caption ?? "Photo"}
                fill
                unoptimized
                sizes="(max-width: 768px) 86vw, 760px"
                className="object-contain"
                onLoadingComplete={() => {
                  if (!current.signedUrl) return;
                  markLoaded(current.signedUrl);
                }}
              />
            </div>

            <div className="min-h-14 px-2 pt-3 text-center sm:min-h-16 sm:pt-4">
              {current.caption ? (
                <p className="font-handwriting text-xl leading-snug text-zinc-700 sm:text-2xl">
                  {current.caption}
                </p>
              ) : null}
            </div>
          </div>

          {!currentLoaded && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-400/40 border-t-zinc-700" />
            </div>
          )}

          {count > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 z-10 text-white/60 hover:bg-white/10 hover:text-white sm:right-4"
              onClick={goNext}
            >
              <ChevronRight className="size-6" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
