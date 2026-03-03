"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRequestOtp, useVerifyOtp } from "@/hooks/use-guest-auth"

type GuestEntryClientProps = {
  sessionId: string
  title: string
  status: "draft" | "active" | "expired"
  requiresPassword: boolean
}

export function GuestEntryClient({
  sessionId,
  title,
  status,
  requiresPassword,
}: GuestEntryClientProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [otpRequested, setOtpRequested] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const requestOtpMutation = useRequestOtp()
  const verifyOtpMutation = useVerifyOtp()

  useEffect(() => {
    if (status !== "active") return

    void (async () => {
      const res = await fetch(`/api/sessions/${sessionId}/camera-init`)
      if (res.ok) {
        router.replace(`/sessions/${sessionId}/camera`)
      }
    })()
  }, [router, sessionId, status])

  async function requestOtp(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    try {
      await requestOtpMutation.mutateAsync({
        sessionId,
        email,
        password: requiresPassword ? password : null,
      })

      setOtpRequested(true)
      setMessage("Code sent. Check your email.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request OTP")
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    try {
      await verifyOtpMutation.mutateAsync({
        sessionId,
        email,
        otp,
      })

      router.replace(`/sessions/${sessionId}/camera`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP")
    }
  }

  const isSubmitting = requestOtpMutation.isPending || verifyOtpMutation.isPending

  if (status !== "active") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              This session is not accepting guests yet.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Join {title}</CardTitle>
          <CardDescription>
            Enter your email to receive a one-time code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!otpRequested ? (
            <form className="space-y-4" onSubmit={requestOtp}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {requiresPassword && (
                <div className="space-y-1.5">
                  <Label htmlFor="sessionPassword">Session password</Label>
                  <Input
                    id="sessionPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending code..." : "Send code"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={verifyOtp}>
              <div className="space-y-1.5">
                <Label htmlFor="otp">One-time code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "Verify code"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setOtpRequested(false)
                  setOtp("")
                }}
              >
                Use a different email
              </Button>
            </form>
          )}

          {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </main>
  )
}
