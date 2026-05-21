-- ==========================================================================
-- CMS Centralization + AI Promo Strategist Foundation (2026-05-21)
-- ==========================================================================
--
-- Phase 1A: PricingTier extension untuk centralization
--   - priceIdr/priceUsd (numeric — checkout calculation)
--   - category enum (SIGNAL/CRYPTO/VPS/DEMO/INSTITUTIONAL)
--   - productSlug (secondary group)
--   - metadata JSON (per-tier props: slot, leverage, modalMin, dll)
--   - popular flag
--
-- Phase 1B: NEW Promotion model — discount + display + AI metadata
-- Phase 1C: NEW CalendarEvent model — Indonesia + international events seed
-- Phase 1D: NEW RevenueSnapshot model — daily MRR baseline untuk strategist
--
-- All non-destructive (ADD COLUMN nullable + CREATE TABLE IF NOT EXISTS).

-- ─── PricingCategory enum ─────────────────────────────────────────────────
CREATE TYPE "PricingCategory" AS ENUM ('SIGNAL', 'CRYPTO', 'VPS', 'DEMO', 'INSTITUTIONAL');

-- ─── PricingTier extension ────────────────────────────────────────────────
ALTER TABLE "PricingTier"
  ADD COLUMN IF NOT EXISTS "priceIdr" INTEGER,
  ADD COLUMN IF NOT EXISTS "priceUsd" INTEGER,
  ADD COLUMN IF NOT EXISTS "category" "PricingCategory" NOT NULL DEFAULT 'CRYPTO',
  ADD COLUMN IF NOT EXISTS "productSlug" TEXT DEFAULT 'crypto',
  ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "popular" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "PricingTier_category_isVisible_idx"
  ON "PricingTier"("category", "isVisible");

-- ─── DiscountType + PromoStatus enums ─────────────────────────────────────
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED_IDR');
CREATE TYPE "PromoStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'PAUSED', 'REJECTED');

-- ─── CalendarEvent table (created BEFORE Promotion karena FK target) ──────
CREATE TABLE "CalendarEvent" (
  "id"           TEXT NOT NULL,
  "slug"         TEXT NOT NULL,
  "templateKey"  TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "name_en"      TEXT,
  "eventDate"    TIMESTAMP(3) NOT NULL,
  "leadDays"     INTEGER NOT NULL DEFAULT 7,
  "country"      TEXT NOT NULL DEFAULT 'ID',
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarEvent_slug_key" ON "CalendarEvent"("slug");
CREATE INDEX "CalendarEvent_eventDate_isActive_idx" ON "CalendarEvent"("eventDate", "isActive");
CREATE INDEX "CalendarEvent_country_idx" ON "CalendarEvent"("country");

-- ─── Promotion table ──────────────────────────────────────────────────────
CREATE TABLE "Promotion" (
  "id"               TEXT NOT NULL,
  "slug"             TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "name_en"          TEXT,
  "description"      TEXT NOT NULL,
  "description_en"   TEXT,
  "discountType"     "DiscountType" NOT NULL DEFAULT 'PERCENT',
  "discountValue"    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "applicableTiers"  JSONB NOT NULL DEFAULT '[]',
  "maxUsage"         INTEGER NOT NULL DEFAULT 0,
  "currentUsage"     INTEGER NOT NULL DEFAULT 0,
  "popupTitle"       TEXT,
  "popupTitle_en"    TEXT,
  "popupBody"        TEXT,
  "popupBody_en"     TEXT,
  "heroImageUrl"     TEXT,
  "ctaLabel"         TEXT,
  "ctaLabel_en"      TEXT,
  "ctaLink"          TEXT DEFAULT '/pricing',
  "popupTrigger"     "PopupTrigger" NOT NULL DEFAULT 'DELAY',
  "popupDelayMs"     INTEGER NOT NULL DEFAULT 3000,
  "startsAt"         TIMESTAMP(3) NOT NULL,
  "endsAt"           TIMESTAMP(3) NOT NULL,
  "status"           "PromoStatus" NOT NULL DEFAULT 'DRAFT',
  "aiGenerated"      BOOLEAN NOT NULL DEFAULT false,
  "aiContext"        JSONB,
  "aiImagePrompt"    TEXT,
  "confidence"       INTEGER NOT NULL DEFAULT 0,
  "calendarEventId"  TEXT,
  "createdById"      TEXT,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Promotion_calendarEventId_fkey" FOREIGN KEY ("calendarEventId")
    REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Promotion_slug_key" ON "Promotion"("slug");
CREATE INDEX "Promotion_status_startsAt_endsAt_idx" ON "Promotion"("status", "startsAt", "endsAt");
CREATE INDEX "Promotion_calendarEventId_idx" ON "Promotion"("calendarEventId");

-- ─── RevenueSnapshot table ────────────────────────────────────────────────
CREATE TABLE "RevenueSnapshot" (
  "id"                 TEXT NOT NULL,
  "snapshotDate"       DATE NOT NULL,
  "mrrIdr"             BIGINT NOT NULL,
  "activeSubscribers"  INTEGER NOT NULL,
  "newSignups24h"      INTEGER NOT NULL DEFAULT 0,
  "churned24h"         INTEGER NOT NULL DEFAULT 0,
  "healthScore"        INTEGER NOT NULL DEFAULT 50,
  "notes"              JSONB NOT NULL DEFAULT '{}',
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevenueSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueSnapshot_snapshotDate_key" ON "RevenueSnapshot"("snapshotDate");
CREATE INDEX "RevenueSnapshot_snapshotDate_idx" ON "RevenueSnapshot"("snapshotDate");
