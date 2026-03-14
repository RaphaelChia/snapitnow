"use server";

import { auth } from "@/auth";
import { z } from "zod";
import { listHostSessions, getSessionById } from "@/lib/db/queries/sessions";
import {
  createSession,
  deleteSession,
  activateSession,
  endSessionByHost,
  updateWeddingDateOnce,
  updateSessionRollPreset,
} from "@/lib/db/mutations/sessions";
import {
  ACTIVATION_PAYMENT_TYPE,
  createPendingActivationPayment,
  expirePendingPaymentById,
  findPendingPaymentByReason,
} from "@/lib/db/mutations/payments";
import {
  createActivationCheckoutSession,
  buildActivationCheckoutIntent,
  expireCheckoutSession,
  getCheckoutSessionSnapshot,
} from "@/lib/payments/checkout";
import {
  getActivationPricing,
  type ActivationPricing,
} from "@/lib/payments/activation-pricing";
import { listSessionPhotos } from "@/lib/db/queries/photos";
import { getStorageService, BUCKET } from "@/lib/storage";
import type { Session, Photo } from "@/lib/db/types";
import {
  auditSessionActivationCheckoutStarted,
  auditSessionCreated,
  auditSessionDeleted,
  auditSessionEndedManual,
  auditSessionWeddingDateUpdated,
} from "@/lib/audit/domain/session";

function isValidIanaTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getCurrentLocalDateForTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const readPart = (partType: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((entry) => entry.type === partType);
    if (!part) {
      throw new Error(`Missing "${partType}" date part`);
    }
    return part.value;
  };
  return `${readPart("year")}-${readPart("month")}-${readPart("day")}`;
}

const createSessionSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100),
    filter_mode: z.enum(["fixed", "preset"]),
    fixed_filter: z.string().nullable().optional(),
    allowed_filters: z.array(z.string()).nullable().optional(),
    roll_preset: z.number().refine((v) => [8, 12, 24, 36].includes(v), {
      message: "Roll preset must be 8, 12, 24, or 36",
    }),
    password: z.string().max(64).nullable().optional(),
    wedding_date_local: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Wedding date must be YYYY-MM-DD"),
    event_timezone: z
      .string()
      .min(1, "Event timezone is required")
      .refine((value) => isValidIanaTimezone(value), "Invalid timezone"),
  })
  .refine(
    (d) =>
      d.filter_mode === "fixed"
        ? !!d.fixed_filter
        : (d.allowed_filters?.length ?? 0) >= 2,
    {
      message:
        "Fixed mode requires a filter selection; preset mode requires at least 2 filters",
    }
  )
  .refine(
    (d) => d.wedding_date_local >= getCurrentLocalDateForTimezone(d.event_timezone),
    {
      message: "Wedding date cannot be in the past",
      path: ["wedding_date_local"],
    },
  );

export type CreateSessionFormData = z.infer<typeof createSessionSchema>;

export type PhotoWithUrl = Photo & {
  signedUrl: string | null;
  thumbnailUrl: string | null;
};

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth();
  console.log("getAuthenticatedUserId", session);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function fetchHostSessions(): Promise<Session[]> {
  const userId = await getAuthenticatedUserId();
  console.log("fetchHostSessions", userId);
  return listHostSessions(userId);
}

export async function fetchSession(sessionId: string): Promise<Session | null> {
  const userId = await getAuthenticatedUserId();
  const session = await getSessionById(sessionId);
  if (session && session.host_id !== userId) return null;
  return session;
}

export async function fetchSessionPhotos(
  sessionId: string
): Promise<PhotoWithUrl[]> {
  const userId = await getAuthenticatedUserId();
  const session = await getSessionById(sessionId);
  if (!session || session.host_id !== userId) throw new Error("Unauthorized");

  const photos = await listSessionPhotos(sessionId);
  const storage = getStorageService();

  const withUrls = await Promise.all(
    photos
      .filter((p) => p.status === "uploaded" || p.status === "processed")
      .map(async (photo): Promise<PhotoWithUrl> => {
        const displayKey = photo.filtered_key ?? photo.object_key;
        const thumbKey = photo.thumbnail_key;

        const [signedUrl, thumbnailUrl] = await Promise.all([
          storage.getSignedUrl(BUCKET, displayKey, 3600).catch(() => null),
          thumbKey
            ? storage.getSignedUrl(BUCKET, thumbKey, 3600).catch(() => null)
            : Promise.resolve(null),
        ]);

        return { ...photo, signedUrl, thumbnailUrl };
      })
  );

  return withUrls;
}

export async function createNewSession(
  input: CreateSessionFormData
): Promise<Session> {
  const userId = await getAuthenticatedUserId();
  const parsed = createSessionSchema.parse(input);

  const created = await createSession({
    host_id: userId,
    title: parsed.title,
    filter_mode: parsed.filter_mode,
    fixed_filter: parsed.fixed_filter ?? null,
    allowed_filters: parsed.allowed_filters ?? null,
    roll_preset: parsed.roll_preset,
    password_hash: parsed.password ?? null,
    wedding_date_local: parsed.wedding_date_local,
    event_timezone: parsed.event_timezone,
  });

  await auditSessionCreated({
    sessionId: created.id,
    actorType: "host",
    actorId: userId,
    metadata: {
      title: created.title,
      status: created.status,
      rollPreset: created.roll_preset,
      filterMode: created.filter_mode,
      weddingDateLocal: created.wedding_date_local,
      eventTimezone: created.event_timezone,
    },
  });

  return created;
}

export async function removeSession(sessionId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const existing = await getSessionById(sessionId);
  if (!existing || existing.host_id !== userId) {
    throw new Error("Session not found");
  }
  await deleteSession(sessionId, userId);
  await auditSessionDeleted({
    sessionId,
    actorType: "host",
    actorId: userId,
    metadata: {
      previousStatus: existing?.status ?? null,
      title: existing?.title ?? null,
    },
  });
}

const activateSessionSchema = z.string().uuid();
const createActivationCheckoutSchema = z.string().uuid();
const endSessionSchema = z.string().uuid();
const updateWeddingDateSchema = z.object({
  sessionId: z.string().uuid(),
  weddingDateLocal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Wedding date must be YYYY-MM-DD"),
  eventTimezone: z
    .string()
    .min(1, "Event timezone is required")
    .refine((value) => isValidIanaTimezone(value), "Invalid timezone"),
});
const activationRollPresetSchema = z
  .number()
  .refine((v) => [8, 12, 24, 36].includes(v), {
    message: "Roll preset must be 8, 12, 24, or 36",
  });

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  return Reflect.get(error, "code") === expectedCode;
}

export async function activateSessionForDev(
  sessionId: string
): Promise<Session> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dev activation is not available in production");
  }

  const userId = await getAuthenticatedUserId();
  const parsedId = activateSessionSchema.parse(sessionId);
  return activateSession(parsedId, userId);
}

export async function createActivationCheckout(
  sessionId: string,
  rollPreset: number
): Promise<{ checkoutUrl: string }> {
  const userId = await getAuthenticatedUserId();
  const parsedId = createActivationCheckoutSchema.parse(sessionId);
  const parsedPreset = activationRollPresetSchema.parse(rollPreset);
  let session = await getSessionById(parsedId);
  if (!session || session.host_id !== userId) {
    throw new Error("Session not found");
  }
  if (session.status !== "draft") {
    throw new Error("Only draft sessions can be activated");
  }

  if (session.roll_preset !== parsedPreset) {
    session = await updateSessionRollPreset(session.id, userId, parsedPreset);
  }

  const pricing = await getActivationPricing(session.roll_preset);
  const expectedCheckoutIntent = buildActivationCheckoutIntent(
    session.roll_preset,
    pricing
  );

  const normalizeForComparison = (value: unknown): string => {
    if (Array.isArray(value)) {
      return `[${value.map((item) => normalizeForComparison(item)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      const keys = Object.keys(value).sort();
      const serializedPairs = keys.map((key) => {
        const objectValue = Reflect.get(value, key);
        return `${JSON.stringify(key)}:${normalizeForComparison(objectValue)}`;
      });
      return `{${serializedPairs.join(",")}}`;
    }
    return JSON.stringify(value);
  };

  const checkoutIntentMatches = (existingIntent: unknown): boolean => {
    return (
      normalizeForComparison(existingIntent) ===
      normalizeForComparison(expectedCheckoutIntent)
    );
  };

  const pendingPayment = await findPendingPaymentByReason({
    sessionId: session.id,
    hostId: userId,
    paymentType: ACTIVATION_PAYMENT_TYPE,
  });

  if (pendingPayment) {
    const pendingIntentMatches = checkoutIntentMatches(
      pendingPayment.checkout_intent
    );

    if (pendingPayment.stripe_checkout_session_id) {
      const snapshot = await getCheckoutSessionSnapshot(
        pendingPayment.stripe_checkout_session_id
      );

      if (pendingIntentMatches && snapshot?.status === "open" && snapshot.url) {
        return { checkoutUrl: snapshot.url };
      }

      if (pendingIntentMatches && snapshot?.status === "complete") {
        throw new Error(
          "A payment is already completing for this session. Please refresh in a moment."
        );
      }

      if (snapshot?.status === "open") {
        await expireCheckoutSession(pendingPayment.stripe_checkout_session_id);
      }
      await expirePendingPaymentById(pendingPayment.id);
    } else {
      await expirePendingPaymentById(pendingPayment.id);
    }
  }

  const checkoutSession = await createActivationCheckoutSession({
    session,
    hostId: userId,
    pricing,
  });

  try {
    await createPendingActivationPayment({
      sessionId: session.id,
      hostId: userId,
      amount: checkoutSession.amount,
      currency: checkoutSession.currency,
      checkoutSessionId: checkoutSession.checkoutSessionId,
      checkoutIntent: expectedCheckoutIntent,
    });
  } catch (error) {
    if (!hasErrorCode(error, "23505")) {
      throw error;
    }

    // Concurrent requests can race between read/create. Fall back to canonical pending row.
    const canonicalPending = await findPendingPaymentByReason({
      sessionId: session.id,
      hostId: userId,
      paymentType: ACTIVATION_PAYMENT_TYPE,
    });
    if (!canonicalPending?.stripe_checkout_session_id) {
      throw error;
    }

    await expireCheckoutSession(checkoutSession.checkoutSessionId);

    const canonicalSnapshot = await getCheckoutSessionSnapshot(
      canonicalPending.stripe_checkout_session_id
    );
    if (
      checkoutIntentMatches(canonicalPending.checkout_intent) &&
      canonicalSnapshot?.status === "open" &&
      canonicalSnapshot.url
    ) {
      return { checkoutUrl: canonicalSnapshot.url };
    }
    throw error;
  }

  await auditSessionActivationCheckoutStarted({
    sessionId: session.id,
    actorType: "host",
    actorId: userId,
    metadata: {
      rollPreset: session.roll_preset,
      amount: checkoutSession.amount,
      currency: checkoutSession.currency,
      stripeCheckoutSessionId: checkoutSession.checkoutSessionId,
      checkoutIntent: expectedCheckoutIntent,
    },
  });

  return { checkoutUrl: checkoutSession.checkoutUrl };
}

export async function fetchActivationPricing(
  rollPreset: number
): Promise<ActivationPricing> {
  await getAuthenticatedUserId();
  return getActivationPricing(rollPreset);
}

export async function updateRollPreset(
  sessionId: string,
  rollPreset: number
): Promise<Session> {
  const userId = await getAuthenticatedUserId();
  const parsedId = z.string().uuid().parse(sessionId);
  const parsedPreset = activationRollPresetSchema.parse(rollPreset);

  return updateSessionRollPreset(parsedId, userId, parsedPreset);
}

export async function endSessionManual(sessionId: string): Promise<Session> {
  const userId = await getAuthenticatedUserId();
  const parsedId = endSessionSchema.parse(sessionId);
  const endedSession = await endSessionByHost(parsedId, userId);

  await auditSessionEndedManual({
    sessionId: endedSession.id,
    actorType: "host",
    actorId: userId,
    metadata: {
      fromStatus: "active",
      toStatus: "expired",
      endedAt: endedSession.ended_at,
      endReason: endedSession.end_reason,
    },
  });

  return endedSession;
}

export async function updateWeddingDate(
  input: {
    sessionId: string;
    weddingDateLocal: string;
    eventTimezone: string;
  }
): Promise<Session> {
  const userId = await getAuthenticatedUserId();
  const parsedInput = updateWeddingDateSchema.parse(input);
  const existing = await getSessionById(parsedInput.sessionId);

  if (!existing || existing.host_id !== userId) {
    throw new Error("Session not found");
  }
  if (existing.wedding_date_update_count >= 1) {
    throw new Error("Wedding date can only be updated once");
  }
  if (
    parsedInput.weddingDateLocal <
    getCurrentLocalDateForTimezone(parsedInput.eventTimezone)
  ) {
    throw new Error("Wedding date cannot be in the past");
  }

  const updatedSession = await updateWeddingDateOnce(
    parsedInput.sessionId,
    userId,
    parsedInput.weddingDateLocal,
    parsedInput.eventTimezone
  );

  await auditSessionWeddingDateUpdated({
    sessionId: updatedSession.id,
    actorType: "host",
    actorId: userId,
    metadata: {
      previousWeddingDateLocal: existing.wedding_date_local,
      previousEventTimezone: existing.event_timezone,
      weddingDateLocal: updatedSession.wedding_date_local,
      eventTimezone: updatedSession.event_timezone,
      weddingDateUpdateCount: updatedSession.wedding_date_update_count,
    },
  });

  return updatedSession;
}
