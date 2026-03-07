"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useGuestSessionPhotos } from "@/hooks/use-photos"

export default function GuestGalleryPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const { data, isLoading, error, refetch, isRefetching } =
    useGuestSessionPhotos(sessionId)

  useEffect(() => {
    if (!(error instanceof Error)) return
    if (error.message !== "UNAUTHORIZED") return
    router.replace(`/s/${sessionId}`)
  }, [error, router, sessionId])

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center justify-center px-4 py-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
      </main>
    )
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Gallery unavailable</CardTitle>
            <CardDescription>
              Could not load photos for this session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const missingShots = Math.max(
    0,
    data.visibility.unlockThreshold - data.visibility.shotsTaken,
  )

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <div className="motion-safe-fade-up mb-4 flex items-center justify-between gap-3">
        <Link
          href={`/s/${sessionId}/camera`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to capture
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card className="motion-safe-fade-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="size-4" />
            Our Wedding Gallery
            <Badge variant={data.visibility.galleryUnlocked ? "default" : "secondary"}>
              {data.visibility.galleryUnlocked ? "Unlocked" : "Locked"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {data.visibility.galleryUnlocked
              ? "You unlocked full gallery access. View all captured moments."
              : `Capture ${missingShots} more moment${missingShots === 1 ? "" : "s"} to unlock our full album.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.photos.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="motion-safe-float flex size-12 items-center justify-center rounded-xl bg-muted">
                <ImageIcon className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No moments yet. Start capturing and check back soon.
              </p>
            </div>
          )}

          {data.photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.photos.map((photo, index) => {
                const url = photo.thumbnailUrl ?? photo.signedUrl
                if (!url) return null

                return (
                <div
                  key={photo.id}
                  className="motion-safe-fade-up relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted shadow-romance transition-transform duration-200 hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                    <img
                      src={url}
                      alt="Session photo"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {photo.isOwnPhoto && (
                      <div className="absolute bottom-1.5 left-1.5">
                        <Badge
                          variant="secondary"
                          className="bg-black/50 text-xs text-white backdrop-blur-sm"
                        >
                          Your moment
                        </Badge>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
