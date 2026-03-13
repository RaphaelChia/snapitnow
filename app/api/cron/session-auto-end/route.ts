import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createServerClient } from "@/lib/db";
import { evaluateSessionCloseDue } from "@/lib/sessions/close-policy";
import { recordAuditEvent } from "@/lib/db/mutations/audit-events";
import type { Database } from "@/lib/db/types";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = {
    scanned: 0,
    expired: 0,
    skippedMissingSchedule: 0,
    skippedRaced: 0,
    failed: 0,
  };

  try {
    const db = createServerClient();
    const { data, error } = await db
      .from("sessions")
      .select("*")
      .eq("status", "active");

    if (error) {
      throw error;
    }

    const activeSessions = data ?? [];
    result.scanned = activeSessions.length;

    for (const session of activeSessions) {
      try {
        const evaluation = evaluateSessionCloseDue({
          weddingDateLocal: session.wedding_date_local,
          eventTimezone: session.event_timezone,
        });

        if (!evaluation) {
          result.skippedMissingSchedule += 1;
          continue;
        }

        if (!evaluation.due) {
          continue;
        }

        const updatePayload: Database["public"]["Tables"]["sessions"]["Update"] = {
          status: "expired",
          ended_at: new Date().toISOString(),
          ended_by: "auto",
          end_reason: "wedding_cutoff",
        };

        const { data: endedRows, error: updateError } = await db
          .from("sessions")
          .update(updatePayload)
          .eq("id", session.id)
          .eq("status", "active")
          .select("id,ended_at,end_reason");

        if (updateError) {
          throw updateError;
        }

        if (!endedRows || endedRows.length === 0) {
          result.skippedRaced += 1;
          continue;
        }

        await recordAuditEvent({
          entityType: "session",
          entityId: session.id,
          eventType: "session.ended.auto_wedding_cutoff",
          actorType: "cron",
          metadata: {
            fromStatus: "active",
            toStatus: "expired",
            weddingDateLocal: session.wedding_date_local,
            eventTimezone: session.event_timezone,
            cutoff: evaluation.cutoffDescription,
            endReason: "wedding_cutoff",
          },
        });

        result.expired += 1;
      } catch (itemError) {
        result.failed += 1;
        console.error("Session auto-end item failed", {
          sessionId: session.id,
          error:
            itemError instanceof Error ? itemError.message : "Unknown error",
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Session auto-end cron failed", error);
    return NextResponse.json(
      { error: "Session auto-end failed" },
      { status: 500 }
    );
  }
}
