-- PWA push notification subscription registry.
-- 2026-05-20 — Phase 1 mobile prereq scaffold (PWA defer go-live, tapi
-- backend infrastructure di-siapkan supaya saat user opt-in dari
-- browser, kita bisa langsung subscribe + dispatch tanpa schema migration.

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "topics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX IF NOT EXISTS "PushSubscription_lastSeenAt_idx" ON "PushSubscription"("lastSeenAt");
