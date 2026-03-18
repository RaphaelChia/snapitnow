"use client"

import { useCallback, useMemo, useState } from "react"
import { Gift, Copy, Check, Send } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useMyReferralOverview } from "@/hooks/use-referrals"

type ReferralShareCardProps = {

  discountPercent?: number
  className?: string
  compact?: boolean
  expandable?: boolean
  defaultExpanded?: boolean
}

export function ReferralShareCard({

  discountPercent = 15,
  className,
  compact = false,
  expandable = false,
  defaultExpanded = false,
}: ReferralShareCardProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [shared, setShared] = useState(false)
  const [isExpanded, setIsExpanded] = useState(
    expandable ? defaultExpanded : true
  )
  const referralQuery = useMyReferralOverview();
  const code = referralQuery.data?.code;


  const referralLink = useMemo(() => {
    if (typeof window === "undefined") return `/r/${code}`
    return `${window.location.origin}/r/${code}`
  }, [code])

  const handleCopyCode = useCallback(async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 1800)
  }, [code])

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1800)
  }, [referralLink])

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      await handleCopyLink()
      return
    }

    await navigator.share({
      title: "SnapItNow referral",
      text: `Join SnapItNow through my link and get ${discountPercent}% off every checkout.`,
      url: referralLink,
    })
    setShared(true)
    setTimeout(() => setShared(false), 1800)
  }, [discountPercent, handleCopyLink, referralLink])

  if (referralQuery.isLoading)
    return (
      <p className="text-sm text-muted-foreground">
        Preparing your referral code...
      </p>)
  return (
    <Card
      className={cn(
        "border-primary/20 bg-primary/5",
        expandable && !isExpanded ? "cursor-pointer" : "",
        className
      )}
      onClick={() => {
        if (expandable && !isExpanded) setIsExpanded(true)
      }}
    >
      <CardHeader className={cn(compact ? "pb-2" : "pb-3")}>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="size-4 text-primary" />
            Share your referral
          </CardTitle>
          {expandable && !isExpanded && (
            <Button variant={'link'} type="button" size="sm" className="p-0 h-fit">
              Share now
            </Button>
          )}
        </div>
        <CardDescription>
          Couples joining through your link get {discountPercent}% off on every checkout.
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className={cn("space-y-3", compact ? "pt-0" : "")}>
          <div className="rounded-md border bg-background px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Referral code</p>
            <p className="font-mono font-semibold tracking-wide">{code}</p>
          </div>
          <div className="rounded-md border bg-background px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Referral link</p>
            <p className="truncate font-mono">{referralLink}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyCode} className="gap-1.5">
              {copiedCode ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copiedCode ? "Code copied" : "Copy code"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
              {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copiedLink ? "Link copied" : "Copy link"}
            </Button>
            <Button type="button" size="sm" onClick={handleShare} className="gap-1.5">
              {shared ? <Check className="size-3.5" /> : <Send className="size-3.5" />}
              {shared ? "Shared" : "Share now"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
