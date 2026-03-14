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
import { useAdminAudit } from "@/hooks/use-admin";

export function AdminAuditPane() {
  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditActorType, setAuditActorType] = useState("");
  const [auditEntityId, setAuditEntityId] = useState("");

  const auditFilters = useMemo(
    () => ({
      entityType: auditEntityType,
      actorType: auditActorType,
      entityId: auditEntityId.trim() || undefined,
      limit: 100,
    }),
    [auditEntityType, auditActorType, auditEntityId]
  );

  const auditQuery = useAdminAudit(auditFilters);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit trail</CardTitle>
        <CardDescription>
          Cross-domain event timeline for support and operations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            value={auditEntityType}
            onChange={(event) => setAuditEntityType(event.target.value)}
            placeholder="Entity type (or all)"
          />
          <Input
            value={auditActorType}
            onChange={(event) => setAuditActorType(event.target.value)}
            placeholder="Actor type (or all)"
          />
          <Input
            value={auditEntityId}
            onChange={(event) => setAuditEntityId(event.target.value)}
            placeholder="Entity id"
          />
        </div>

        <div className="space-y-2">
          {(auditQuery.data ?? []).map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-border/60 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{event.event_type}</p>
                <Badge variant="outline">{event.actor_type}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {event.entity_type}:{event.entity_id} ·{" "}
                {new Date(event.occurred_at).toLocaleString()}
              </p>
            </div>
          ))}
          {auditQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No audit events found for this filter.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
