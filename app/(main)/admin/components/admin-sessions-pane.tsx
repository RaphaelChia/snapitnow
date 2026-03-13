"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useAdminForceExpireSession,
  useAdminForceReactivateSession,
  useAdminSessions,
} from "@/hooks/use-admin"

function parseSessionStatus(value: string): "all" | "draft" | "active" | "expired" {
  if (value === "draft" || value === "active" || value === "expired") return value
  return "all"
}

function normalizeStatusLabel(value: string): string {
  return value.replaceAll("_", " ")
}

export function AdminSessionsPane() {
  const [sessionStatus, setSessionStatus] = useState<"all" | "draft" | "active" | "expired">(
    "all"
  )
  const [sessionHostEmail, setSessionHostEmail] = useState("")
  const [sessionSearch, setSessionSearch] = useState("")
  const [actionReasonBySessionId, setActionReasonBySessionId] = useState<
    Record<string, string>
  >({})

  const sessionFilters = useMemo(
    () => ({
      status: sessionStatus,
      hostEmail: sessionHostEmail.trim() || undefined,
      query: sessionSearch.trim() || undefined,
      limit: 50,
    }),
    [sessionStatus, sessionHostEmail, sessionSearch]
  )

  const sessionsQuery = useAdminSessions(sessionFilters)
  const expireMutation = useAdminForceExpireSession()
  const reactivateMutation = useAdminForceReactivateSession()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions</CardTitle>
        <CardDescription>
          Force expire or reactivate sessions with required audit reasons.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={sessionStatus} onValueChange={(value) => setSessionStatus(parseSessionStatus(value))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={sessionHostEmail}
            onChange={(event) => setSessionHostEmail(event.target.value)}
            placeholder="Filter by host email"
          />
          <Input
            value={sessionSearch}
            onChange={(event) => setSessionSearch(event.target.value)}
            placeholder="Search session id/title"
          />
        </div>

        <div className="space-y-2">
          {(sessionsQuery.data ?? []).map((item) => {
            const reason = actionReasonBySessionId[item.session.id] ?? ""
            const isBusy = expireMutation.isPending || reactivateMutation.isPending
            return (
              <div key={item.session.id} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.session.id} · {item.hostEmail ?? "unknown host"}
                    </p>
                  </div>
                  <Badge variant="secondary">{normalizeStatusLabel(item.session.status)}</Badge>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={reason}
                    onChange={(event) =>
                      setActionReasonBySessionId((prev) => ({
                        ...prev,
                        [item.session.id]: event.target.value,
                      }))
                    }
                    placeholder="Reason for audit trail"
                  />
                  <Button
                    variant="destructive"
                    disabled={
                      isBusy ||
                      !reason.trim() ||
                      (item.session.status !== "draft" && item.session.status !== "active")
                    }
                    onClick={() =>
                      expireMutation.mutate({
                        sessionId: item.session.id,
                        reason: reason.trim(),
                      })
                    }
                  >
                    Force expire
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isBusy || !reason.trim() || item.session.status !== "expired"}
                    onClick={() =>
                      reactivateMutation.mutate({
                        sessionId: item.session.id,
                        reason: reason.trim(),
                      })
                    }
                  >
                    Reactivate
                  </Button>
                </div>
              </div>
            )
          })}
          {sessionsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No sessions found for this filter.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
