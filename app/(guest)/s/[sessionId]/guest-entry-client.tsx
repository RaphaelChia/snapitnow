"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GuestApiError,
  useGuestCameraInit,
  useRequestOtp,
  useVerifyOtp,
} from "@/hooks/use-guest-auth";

type GuestEntryClientProps = {
  sessionId: string;
  title: string;
  status: "draft" | "active" | "expired";
  requiresPassword: boolean;
};

type AuthStep = "requestOtp" | "verifyOtp";

export function GuestEntryClient({
  sessionId,
  title,
  status,
  requiresPassword,
}: GuestEntryClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [authStep, setAuthStep] = useState<AuthStep>("requestOtp");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();
  const cameraInitQuery = useGuestCameraInit(sessionId, status === "active");
  const isActive = status === "active";
  const isExpired = status === "expired";

  useEffect(() => {
    if (cameraInitQuery.data) {
      router.replace(`/s/${sessionId}/camera`);
    }
  }, [cameraInitQuery.data, router, sessionId]);

  const requestOtp = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setMessage(null);

      try {
        await requestOtpMutation.mutateAsync({
          sessionId,
          email,
          password: requiresPassword ? password : null,
        });

        verifyOtpMutation.reset();
        setAuthStep("verifyOtp");
        setMessage("Code sent. Check your email.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to request OTP");
      }
    },
    [
      email,
      requestOtpMutation,
      requiresPassword,
      password,
      sessionId,
      verifyOtpMutation,
    ]
  );

  const verifyOtp = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setMessage(null);

      try {
        await verifyOtpMutation.mutateAsync({
          sessionId,
          email,
          otp,
        });
        if (isActive) {
          router.replace(`/s/${sessionId}/camera`);
          return;
        }
        router.replace(`/s/${sessionId}/gallery`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to verify OTP");
      }
    },
    [email, otp, router, sessionId, verifyOtpMutation, isActive]
  );

  const isRequestSubmitting = requestOtpMutation.isPending;
  const isVerifySubmitting = verifyOtpMutation.isPending;
  const isRequestStep = authStep === "requestOtp";
  const isCheckingPriorSession = isActive && cameraInitQuery.isPending;
  const isUnauthenticated =
    cameraInitQuery.error instanceof GuestApiError &&
    cameraInitQuery.error.status === 401;
  const cameraInitError =
    cameraInitQuery.isError && !isUnauthenticated
      ? cameraInitQuery.error
      : null;

  const resetToRequestStep = useCallback(() => {
    // iOS Chrome can throw when focused input unmounts during keyboard transitions.
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    requestOtpMutation.reset();
    verifyOtpMutation.reset();
    setAuthStep("requestOtp");
    setOtp("");
    setError(null);
    setMessage(null);
  }, [requestOtpMutation, verifyOtpMutation]);

  if (status === "draft") {
    return (
      <main className="mx-auto flex min-h-full max-h-[calc(100svh-64px)] w-full max-w-md flex-1 items-center px-4 py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              This wedding memory isn&apos;t open for guests yet.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (isCheckingPriorSession) {
    return (
      <main className="mx-auto flex min-h-full max-h-[calc(100svh-64px)] w-full max-w-md flex-1 items-center px-4 py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Join {title}</CardTitle>
            <CardDescription>
              Checking if you&apos;ve joined before...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
            <p className="text-sm text-muted-foreground">
              One moment while we find your memories.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex  w-full max-w-md flex-1 items-center px-4 py-8 ">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Join the Celebration of {title}
          </CardTitle>
          <CardDescription>
            {isExpired
              ? `Thank you for being part of ${title}'s celebration. Uploads are now closed, but you can still verify access to view the gallery.`
              : "Everyone is given a limited number of shots to capture everything in the moment."}
            {isRequestStep ? "" : ` Enter the code we sent to ${email}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="motion-safe-fade-up">
            {isRequestStep ? (
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isRequestSubmitting}
                >
                  {isRequestSubmitting ? "Sending code..." : "Get Started"}
                </Button>
              </form>
            ) : (
              <>
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
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isVerifySubmitting}
                  >
                    {isVerifySubmitting
                      ? "Verifying..."
                      : isExpired
                        ? "Verify and view gallery"
                        : "Verify code"}
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-4 w-full"
                  disabled={isVerifySubmitting}
                  onClick={resetToRequestStep}
                >
                  Use a different email
                </Button>
              </>
            )}
          </div>

          {message && (
            <p className="mt-4 text-sm text-romance-success">{message}</p>
          )}
          {cameraInitError && (
            <p className="mt-4 text-sm text-destructive">
              {cameraInitError instanceof Error
                ? cameraInitError.message
                : "Failed to check previous access"}
            </p>
          )}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
