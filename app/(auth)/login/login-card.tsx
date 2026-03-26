"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader
} from "@/components/ui/card"
import { Heart, LockIcon } from "lucide-react"
import { signIn } from "next-auth/react"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function LoginCard() {
  return (
    <Card className="w-full max-w-sm max-md:border-0 max-md:bg-transparent max-md:shadow-none! max-md:h-dvh">
      <CardHeader className="items-center text-center max-md:fixed max-md:w-full max-md:left-0 max-md:top-[45%]">
        <div className="flex items-center justify-center gap-2 font-bold">
          <div className="flex size-7 items-center justify-center rounded-xl bg-romance-primary shadow-romance">
            <Heart className="size-4 fill-primary-foreground text-primary-foreground" strokeWidth={2} />
          </div>
          <div className="font-display text-xl">SnapItNow</div>
        </div>
        <CardDescription className="font-semibold max-md:mx-4">
          Start a session, share your QR code, and let your guests capture moments from their POV
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 mt-auto px-0">
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full gap-3 bg-primary/40 border-0"
          onClick={() =>
            signIn("google", { callbackUrl: "/api/referrals/consume" })
          }
        >
          <GoogleIcon className="size-5" />
          Continue with Google
        </Button>

        <p className="flex items-start gap-2 px-2 text-xs leading-tight text-muted-foreground">
          <LockIcon className="size-4 mt-1 " /> Your data will not be used or shared with third parties.
        </p>
      </CardContent>
    </Card>
  )
}
