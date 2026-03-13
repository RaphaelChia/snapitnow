import "server-only";
import { createServerClient } from "../index";
import type { Database, Json } from "../types";

type ActorType = "host" | "guest" | "system" | "cron" | "webhook";

export type RecordAuditEventInput = {
  entityType: string;
  entityId: string;
  eventType: string;
  actorType: ActorType;
  actorId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  metadata?: Json;
};

type ActorSnapshot = {
  id: string | null;
  type: ActorType;
  name: string | null;
  email: string | null;
};

async function resolveActorSnapshot(
  actorType: ActorType,
  actorId: string | null
): Promise<ActorSnapshot> {
  if (!actorId) {
    return { id: null, type: actorType, name: null, email: null };
  }

  const db = createServerClient();

  if (actorType === "host") {
    const { data } = await db
      .from("hosts")
      .select("name,email")
      .eq("id", actorId)
      .single();

    return {
      id: actorId,
      type: actorType,
      name: data?.name ?? null,
      email: data?.email ?? null,
    };
  }

  if (actorType === "guest") {
    const { data } = await db
      .from("guest_identities")
      .select("email")
      .eq("id", actorId)
      .single();

    return {
      id: actorId,
      type: actorType,
      name: null,
      email: data?.email ?? null,
    };
  }

  return { id: actorId, type: actorType, name: null, email: null };
}

function buildAuditMetadata(
  metadata: Json | undefined,
  actorSnapshot: ActorSnapshot
): Json {
  const base: Record<string, Json> = {
    schemaVersion: 1,
    actorSnapshot,
  };

  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
  ) {
    return {
      ...base,
      ...metadata,
    };
  }

  if (metadata !== undefined) {
    return {
      ...base,
      payload: metadata,
    };
  }

  return base;
}

export async function recordAuditEvent(
  input: RecordAuditEventInput
): Promise<void> {
  const db = createServerClient();
  const actorId = input.actorId ?? null;
  const actorSnapshot = await resolveActorSnapshot(input.actorType, actorId);
  const auditInsert: Database["public"]["Tables"]["audit_events"]["Insert"] = {
    entity_type: input.entityType,
    entity_id: input.entityId,
    event_type: input.eventType,
    actor_type: input.actorType,
    actor_id: actorId,
    request_id: input.requestId ?? null,
    correlation_id: input.correlationId ?? null,
    metadata: buildAuditMetadata(input.metadata, actorSnapshot),
  };

  const { error } = await db.from("audit_events").insert(auditInsert);
  if (error) {
    throw error;
  }
}
