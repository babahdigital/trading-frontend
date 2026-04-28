-- Add PasswordResetToken table for self-service password recovery flow.
-- Per launch plan 2026-04-29: customer requests reset → API issues raw
-- 32-byte hex token, persists SHA-256 hash + 1h TTL here, emails raw token
-- in URL query string. Reset endpoint hashes incoming token, looks up the
-- row, validates expiresAt + usedAt, then mutates User.passwordHash and
-- marks usedAt = now. Cascade delete with User per GDPR right-to-erasure.

CREATE TABLE "PasswordResetToken" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "token"      TEXT         NOT NULL,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "usedAt"     TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress"  TEXT,
    "userAgent"  TEXT,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken" ("token");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken" ("userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken" ("expiresAt");

ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
