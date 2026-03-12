"use server";

import { auth } from "@/auth";
import { z } from "zod";
import { listHostSessions, getSessionById } from "@/lib/db/queries/sessions";
import {
  createSession,
  deleteSession,
  activateSession,
} from "@/lib/db/mutations/sessions";
import {
  ACTIVATION_PAYMENT_TYPE,
  createPendingActivationPayment,
  expirePendingPaymentById,
  findPendingPaymentByReason,
} from "@/lib/db/mutations/payments";
import {
  createActivationCheckoutSession,
  expireCheckoutSession,
  getCheckoutSessionSnapshot,
} from "@/lib/payments/checkout";
import { listSessionPhotos } from "@/lib/db/queries/photos";
import { getStorageService, BUCKET } from "@/lib/storage";
import type { Session, Photo } from "@/lib/db/types";

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

  return createSession({
    host_id: userId,
    title: parsed.title,
    filter_mode: parsed.filter_mode,
    fixed_filter: parsed.fixed_filter ?? null,
    allowed_filters: parsed.allowed_filters ?? null,
    roll_preset: parsed.roll_preset,
    password_hash: parsed.password ?? null,
  });
}

export async function removeSession(sessionId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  await deleteSession(sessionId, userId);
}

const activateSessionSchema = z.string().uuid();
const createActivationCheckoutSchema = z.string().uuid();

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
  sessionId: string
): Promise<{ checkoutUrl: string }> {
  const userId = await getAuthenticatedUserId();
  const parsedId = createActivationCheckoutSchema.parse(sessionId);
  const session = await getSessionById(parsedId);

  if (!session || session.host_id !== userId) {
    throw new Error("Session not found");
  }
  if (session.status !== "draft") {
    throw new Error("Only draft sessions can be activated");
  }

  const pendingPayment = await findPendingPaymentByReason({
    sessionId: session.id,
    hostId: userId,
    paymentType: ACTIVATION_PAYMENT_TYPE,
  });

  if (pendingPayment?.stripe_checkout_session_id) {
    const snapshot = await getCheckoutSessionSnapshot(
      pendingPayment.stripe_checkout_session_id
    );

    // Reuse is the primary preventive control: keep exactly one payable link alive.
    if (snapshot?.status === "open" && snapshot.url) {
      return { checkoutUrl: snapshot.url };
    }

    if (snapshot?.status === "complete") {
      throw new Error(
        "A payment is already completing for this session. Please refresh in a moment."
      );
    }

    if (snapshot?.status === "open" && !snapshot.url) {
      await expireCheckoutSession(pendingPayment.stripe_checkout_session_id);
    }
    await expirePendingPaymentById(pendingPayment.id);
  } else if (pendingPayment) {
    await expirePendingPaymentById(pendingPayment.id);
  }

  const checkoutSession = await createActivationCheckoutSession({
    session,
    hostId: userId,
    idempotencyKey: `checkout:${session.id}:${ACTIVATION_PAYMENT_TYPE}`,
  });

  try {
    await createPendingActivationPayment({
      sessionId: session.id,
      hostId: userId,
      amount: checkoutSession.amount,
      currency: checkoutSession.currency,
      checkoutSessionId: checkoutSession.checkoutSessionId,
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

    const canonicalSnapshot = await getCheckoutSessionSnapshot(
      canonicalPending.stripe_checkout_session_id
    );
    if (canonicalSnapshot?.status === "open" && canonicalSnapshot.url) {
      return { checkoutUrl: canonicalSnapshot.url };
    }
    throw error;
  }

  return { checkoutUrl: checkoutSession.checkoutUrl };
}
