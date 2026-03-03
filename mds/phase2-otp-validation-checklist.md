# Phase 2 OTP Validation Checklist

## Environment Variables

- `GUEST_TOKEN_SECRET` (optional; falls back to `AUTH_SECRET`)
- `GUEST_OTP_TTL_SECONDS` (default: `600`)
- `GUEST_OTP_MAX_ATTEMPTS` (default: `5`)
- `GUEST_AUTH_SESSION_TTL_SECONDS` (default: `86400`)
- `SMTP_HOST`
- `SMTP_PORT` (default: `587`)
- `SMTP_SECURE` (`true` or `false`, default: `false`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (optional, falls back to SMTP user)

## Rate-Limit Points

- `POST /api/guest/auth/request-otp`
  - Key: `otp-request:{ip}:{sessionId}`
  - Limit: `5 requests / 10 minutes`
- `POST /api/guest/auth/verify-otp`
  - Key: `otp-verify:{ip}:{sessionId}:{email}`
  - Limit: `10 requests / 10 minutes`

## Core Validation (Happy Path)

1. Host creates session in draft mode.
2. Host clicks `Activate session (Dev)` on session detail page.
3. Guest opens `/s/:sessionId` and requests OTP with email.
4. Guest receives email and verifies code.
5. Guest is redirected to `/sessions/:sessionId/camera`.
6. Guest captures a photo; upload succeeds and shot count decrements.

## Negative Cases

1. Guest opens inactive session (`draft` or `expired`) -> blocked from join.
2. Wrong session password on OTP request -> 403.
3. Wrong OTP on verify -> 400 and attempt counter increments.
4. Expired OTP on verify -> 400.
5. Attempts exceed `GUEST_OTP_MAX_ATTEMPTS` -> 429.
6. Missing/invalid guest cookie on camera init/upload -> 401.
7. Guest cannot request signed URL for another guest's photo.
