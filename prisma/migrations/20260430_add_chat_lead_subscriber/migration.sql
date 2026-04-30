-- ChatLead + Subscriber capture (2026-04-30)
--
-- Why: Pak Abdullah mandate — zero-touch chat assistant. Sebelum percakapan
-- dengan AI, calon user wajib isi nama/email/telpon supaya CRM follow-up
-- tetap mungkin via WhatsApp/email meskipun user belum register. Newsletter
-- Subscriber model dipakai untuk distribusi research harian dan blast
-- artikel baru dari /admin.
--
-- Idempotent: aman di-replay (IF NOT EXISTS pada semua object).

-- 1. ChatLead status enum
DO $$ BEGIN
  CREATE TYPE "ChatLeadStatus" AS ENUM ('NEW', 'CONVERTED', 'CONTACTED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. ChatLead table
CREATE TABLE IF NOT EXISTS "ChatLead" (
  "id"              TEXT             NOT NULL,
  "name"            TEXT             NOT NULL,
  "email"           TEXT             NOT NULL,
  "phone"           TEXT             NOT NULL,
  "locale"          TEXT             NOT NULL DEFAULT 'id',
  "referrerPath"    TEXT,
  "ipAddress"       TEXT,
  "userAgent"       TEXT,
  "userId"          TEXT,
  "consentMarketing" BOOLEAN         NOT NULL DEFAULT false,
  "status"          "ChatLeadStatus" NOT NULL DEFAULT 'NEW',
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)     NOT NULL,

  CONSTRAINT "ChatLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatLead_email_idx"            ON "ChatLead"("email");
CREATE INDEX IF NOT EXISTS "ChatLead_phone_idx"            ON "ChatLead"("phone");
CREATE INDEX IF NOT EXISTS "ChatLead_status_createdAt_idx" ON "ChatLead"("status", "createdAt");

-- 3. Subscriber source + status enums
DO $$ BEGIN
  CREATE TYPE "SubscriberSource" AS ENUM (
    'FOOTER', 'CHAT_LEAD', 'CONTACT_FORM', 'RESEARCH_INLINE', 'EXIT_INTENT', 'IMPORT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriberStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED', 'BOUNCED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Subscriber table
CREATE TABLE IF NOT EXISTS "Subscriber" (
  "id"          TEXT               NOT NULL,
  "email"       TEXT               NOT NULL,
  "name"        TEXT,
  "phone"       TEXT,
  "locale"      TEXT               NOT NULL DEFAULT 'id',
  "source"      "SubscriberSource" NOT NULL DEFAULT 'FOOTER',
  "status"      "SubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
  "unsubToken"  TEXT               NOT NULL,
  "ipAddress"   TEXT,
  "userAgent"   TEXT,
  "lastSentAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)       NOT NULL,

  CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscriber_email_key"      ON "Subscriber"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscriber_unsubToken_key" ON "Subscriber"("unsubToken");
CREATE INDEX        IF NOT EXISTS "Subscriber_status_createdAt_idx"
  ON "Subscriber"("status", "createdAt");
