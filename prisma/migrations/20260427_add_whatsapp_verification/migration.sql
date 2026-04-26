-- Add WhatsappVerification table for OTP-based number verification flow.
-- Per audit 2026-04-26 + WA notification spec 2026-04-27: frontend issues
-- a 6-digit OTP when a user sets a WhatsApp routing target. The hash + TTL
-- live here so we can verify OTP submission without persisting raw codes.
-- Cleanup cron prunes rows expiresAt < now() OR consumedAt < now() - 30d.

CREATE TABLE "WhatsappVerification" (
    "id"          TEXT         NOT NULL,
    "userId"      TEXT         NOT NULL,
    "product"     TEXT         NOT NULL,
    "e164"        TEXT         NOT NULL,
    "otpHash"     TEXT         NOT NULL,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "consumedAt"  TIMESTAMP(3),
    "attempts"    INTEGER      NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsappVerification_userId_product_idx" ON "WhatsappVerification" ("userId", "product");
CREATE INDEX "WhatsappVerification_expiresAt_idx" ON "WhatsappVerification" ("expiresAt");
