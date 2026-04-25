-- CreateEnum
CREATE TYPE "CryptoSubscriptionTier" AS ENUM ('CRYPTO_BASIC', 'CRYPTO_PRO', 'CRYPTO_HNWI');

-- CreateEnum
CREATE TYPE "CryptoSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'SUSPENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CryptoBotSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "CryptoSubscriptionTier" NOT NULL,
    "status" "CryptoSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "cryptoTenantId" TEXT,
    "binanceUidHash" TEXT,
    "apiKeyConnected" BOOLEAN NOT NULL DEFAULT false,
    "apiKeyVerifiedAt" TIMESTAMP(3),
    "monthlyFeeUsd" DECIMAL(10,2) NOT NULL,
    "profitSharePct" DECIMAL(5,2) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "nextBillingAt" TIMESTAMP(3),
    "maxLeverage" INTEGER NOT NULL DEFAULT 10,
    "maxPairs" INTEGER NOT NULL DEFAULT 3,
    "selectedStrategy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoBotSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoAuditTrail" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoAuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CryptoBotSubscription_userId_key" ON "CryptoBotSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoBotSubscription_cryptoTenantId_key" ON "CryptoBotSubscription"("cryptoTenantId");

-- CreateIndex
CREATE INDEX "CryptoBotSubscription_status_idx" ON "CryptoBotSubscription"("status");

-- CreateIndex
CREATE INDEX "CryptoBotSubscription_nextBillingAt_idx" ON "CryptoBotSubscription"("nextBillingAt");

-- CreateIndex
CREATE INDEX "CryptoAuditTrail_subscriptionId_createdAt_idx" ON "CryptoAuditTrail"("subscriptionId", "createdAt");

-- AddForeignKey
ALTER TABLE "CryptoBotSubscription" ADD CONSTRAINT "CryptoBotSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoAuditTrail" ADD CONSTRAINT "CryptoAuditTrail_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CryptoBotSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
