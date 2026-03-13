"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminPayments } from "@/hooks/use-admin";

function normalizeStatusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function getPaymentStatusBadgeStyle(status: string): {
  variant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  className?: string;
} {
  switch (status) {
    case "succeeded":
    case "won_dispute":
      return {
        variant: "secondary",
        className:
          "border-emerald-300/60 bg-emerald-100 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-300",
      };
    case "pending":
      return {
        variant: "outline",
        className:
          "border-amber-300/70 bg-amber-100 text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-300",
      };
    case "refunded":
    case "partially_refunded":
    case "expired":
      return {
        variant: "outline",
        className:
          "border-slate-300/70 bg-slate-100 text-slate-800 dark:border-slate-700/60 dark:bg-slate-900/30 dark:text-slate-300",
      };
    case "failed":
    case "lost_dispute":
    case "disputed":
      return { variant: "destructive" };
    case "duplicate_settlement":
      return {
        variant: "outline",
        className:
          "border-purple-300/70 bg-purple-100 text-purple-800 dark:border-purple-700/60 dark:bg-purple-900/30 dark:text-purple-300",
      };
    default:
      return { variant: "secondary" };
  }
}

export function AdminPaymentsPane() {
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [paymentHostEmail, setPaymentHostEmail] = useState("");
  const [paymentSessionId, setPaymentSessionId] = useState("");
  const [paymentStripeLookup, setPaymentStripeLookup] = useState("");

  const paymentFilters = useMemo(
    () => ({
      status: paymentStatus,
      paymentType,
      hostEmail: paymentHostEmail.trim() || undefined,
      sessionId: paymentSessionId.trim() || undefined,
      stripeLookup: paymentStripeLookup.trim() || undefined,
      limit: 50,
    }),
    [
      paymentStatus,
      paymentType,
      paymentHostEmail,
      paymentSessionId,
      paymentStripeLookup,
    ]
  );

  const paymentsQuery = useAdminPayments(paymentFilters);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments (Read-only)</CardTitle>
        <CardDescription>
          Track Stripe outcomes without mutation controls.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value)}
            placeholder="Status (or all)"
          />
          <Input
            value={paymentType}
            onChange={(event) => setPaymentType(event.target.value)}
            placeholder="Payment type (or all)"
          />
          <Input
            value={paymentHostEmail}
            onChange={(event) => setPaymentHostEmail(event.target.value)}
            placeholder="Host email"
          />
          <Input
            value={paymentSessionId}
            onChange={(event) => setPaymentSessionId(event.target.value)}
            placeholder="Session id"
          />
          <Input
            value={paymentStripeLookup}
            onChange={(event) => setPaymentStripeLookup(event.target.value)}
            placeholder="Stripe session or intent id"
          />
        </div>

        <div className="space-y-2">
          {(paymentsQuery.data ?? []).map((item) => {
            const badgeStyle = getPaymentStatusBadgeStyle(item.payment.status);
            return (
              <div
                key={item.payment.id}
                className="rounded-lg border border-border/60 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {item.hostEmail ?? "unknown host"} ·{" "}
                    {item.payment.payment_type}
                  </p>
                  <Badge variant={badgeStyle.variant} className={badgeStyle.className}>
                    {normalizeStatusLabel(item.payment.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  session {item.payment.session_id} ·{" "}
                  {item.payment.currency.toUpperCase()}{" "}
                  {(item.payment.amount / 100).toFixed(2)} · checkout{" "}
                  {item.payment.stripe_checkout_session_id ?? "n/a"} · intent{" "}
                  {item.payment.stripe_payment_intent_id ?? "n/a"}
                </p>
              </div>
            );
          })}
          {paymentsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No payments found for this filter.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
