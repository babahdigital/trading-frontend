-- Self-hosted analytics events table.
-- 2026-05-20 — Phase A polish prereq. PMF measurement tanpa external
-- third-party (privacy-first: no Plausible/Mixpanel/GA). Pageview + funnel
-- event ingestion ke Postgres direct.

CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "eventType"   TEXT NOT NULL,
  "path"        TEXT,
  "referrer"    TEXT,
  "utmSource"   TEXT,
  "utmMedium"   TEXT,
  "utmCampaign" TEXT,
  "sessionId"   TEXT,
  "userId"      TEXT,
  "metadata"    JSONB NOT NULL DEFAULT '{}',
  "ipHash"      TEXT,
  "userAgent"   TEXT,
  "country"     TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_path_createdAt_idx" ON "AnalyticsEvent"("path", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");
