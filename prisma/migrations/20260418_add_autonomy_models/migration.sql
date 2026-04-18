-- =============================================================================
-- Autonomy layer: VPS1 consumers, signal audit, notifications, billing, changelog
-- =============================================================================

-- CreateEnum
CREATE TYPE "SignalOutcome" AS ENUM ('PENDING', 'OPEN', 'WIN', 'LOSS', 'BREAKEVEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('TELEGRAM', 'EMAIL', 'WHATSAPP', 'INAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'DUE', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ChangelogCategory" AS ENUM ('FEATURE', 'IMPROVEMENT', 'FIX', 'SECURITY', 'BREAKING');

-- AlterTable User — add 2FA + contact fields
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "twoFaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "recoveryCodes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT;

-- CreateTable ConsumerState
CREATE TABLE "ConsumerState" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "lastSeenId" BIGINT NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsumerState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConsumerState_scope_key" ON "ConsumerState"("scope");

-- CreateTable SignalAuditLog
CREATE TABLE "SignalAuditLog" (
    "id" TEXT NOT NULL,
    "sourceId" BIGINT NOT NULL,
    "pair" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "entryType" TEXT,
    "lot" DECIMAL(10, 2),
    "entryPrice" DECIMAL(15, 5),
    "stopLoss" DECIMAL(15, 5),
    "takeProfit" DECIMAL(15, 5),
    "confidence" DECIMAL(4, 2),
    "reasoning" TEXT,
    "indicatorSnapshot" JSONB,
    "emittedAt" TIMESTAMP(3) NOT NULL,
    "outcome" "SignalOutcome" NOT NULL DEFAULT 'PENDING',
    "closePrice" DECIMAL(15, 5),
    "closeReason" TEXT,
    "profitUsd" DECIMAL(12, 4),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SignalAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SignalAuditLog_sourceId_key" ON "SignalAuditLog"("sourceId");
CREATE INDEX "SignalAuditLog_pair_emittedAt_idx" ON "SignalAuditLog"("pair", "emittedAt");
CREATE INDEX "SignalAuditLog_outcome_emittedAt_idx" ON "SignalAuditLog"("outcome", "emittedAt");
CREATE INDEX "SignalAuditLog_emittedAt_idx" ON "SignalAuditLog"("emittedAt");

-- CreateTable NotificationLog
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "category" TEXT NOT NULL,
    "refId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotificationLog_userId_createdAt_idx" ON "NotificationLog"("userId", "createdAt");
CREATE INDEX "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status", "createdAt");

-- CreateTable NotificationPreference
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channels" JSONB NOT NULL DEFAULT '["INAPP"]',
    "minConfidence" DECIMAL(4, 2),
    "language" TEXT NOT NULL DEFAULT 'id',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateTable Invoice
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amountUsd" DECIMAL(10, 2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DUE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "licenseId" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_userId_issuedAt_idx" ON "Invoice"("userId", "issuedAt");
CREATE INDEX "Invoice_status_dueAt_idx" ON "Invoice"("status", "dueAt");

-- CreateTable Changelog
CREATE TABLE "Changelog" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_en" TEXT,
    "body" TEXT NOT NULL,
    "body_en" TEXT,
    "category" "ChangelogCategory" NOT NULL DEFAULT 'FEATURE',
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Changelog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Changelog_version_key" ON "Changelog"("version");
CREATE INDEX "Changelog_isPublished_releasedAt_idx" ON "Changelog"("isPublished", "releasedAt");

-- CreateTable WorkerRun
CREATE TABLE "WorkerRun" (
    "id" TEXT NOT NULL,
    "worker" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "WorkerRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkerRun_worker_startedAt_idx" ON "WorkerRun"("worker", "startedAt");
