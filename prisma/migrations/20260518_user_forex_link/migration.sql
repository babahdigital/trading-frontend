-- Phase 14V FE bridge (2026-05-18) — link FE user to backend tenant.
-- Adds nullable columns so existing rows continue to function; backend
-- bridge login is opportunistic (no api_token = skip backend session,
-- portal still works against FE-internal JWT).

ALTER TABLE "User"
  ADD COLUMN "forexTenantId" TEXT,
  ADD COLUMN "forexApiToken" TEXT,
  ADD COLUMN "forexLinkedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_forexTenantId_key" ON "User"("forexTenantId");
