-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');
CREATE TYPE "LicenseType" AS ENUM ('VPS_INSTALLATION', 'PAMM_SUBSCRIBER', 'SIGNAL_SUBSCRIBER');
CREATE TYPE "LicenseStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED');
CREATE TYPE "VpsStatus" AS ENUM ('PROVISIONING', 'ONLINE', 'OFFLINE', 'SUSPENDED');
CREATE TYPE "SubscriptionTier" AS ENUM ('PAMM_BASIC', 'PAMM_PRO', 'SIGNAL_BASIC', 'SIGNAL_VIP');

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "name" TEXT,
    "mt5Account" TEXT,
    "twoFaSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_mt5Account_key" ON "User"("mt5Account");

-- CreateTable: VpsInstance
CREATE TABLE "VpsInstance" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 8000,
    "backendBaseUrl" TEXT NOT NULL,
    "adminTokenCiphertext" TEXT NOT NULL,
    "adminTokenIv" TEXT NOT NULL,
    "adminTokenTag" TEXT NOT NULL,
    "sshHost" TEXT,
    "sshPort" INTEGER DEFAULT 1983,
    "sshUser" TEXT,
    "status" "VpsStatus" NOT NULL DEFAULT 'PROVISIONING',
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastHealthStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VpsInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable: License
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "type" "LicenseType" NOT NULL,
    "vpsInstanceId" TEXT,
    "status" "LicenseStatus" NOT NULL DEFAULT 'PENDING',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "License_licenseKey_key" ON "License"("licenseKey");
CREATE INDEX "License_status_expiresAt_idx" ON "License"("status", "expiresAt");
CREATE INDEX "License_userId_idx" ON "License"("userId");

-- CreateTable: Subscription
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "LicenseStatus" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "profitSharePct" DECIMAL(5,2),
    "monthlyFeeUsd" DECIMAL(10,2),
    "brokerAccountId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateTable: KillSwitchEvent
CREATE TABLE "KillSwitchEvent" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apiResponse" JSONB NOT NULL DEFAULT '{}',
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    CONSTRAINT "KillSwitchEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KillSwitchEvent_licenseId_idx" ON "KillSwitchEvent"("licenseId");

-- CreateTable: HealthCheck
CREATE TABLE "HealthCheck" (
    "id" TEXT NOT NULL,
    "vpsInstanceId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "httpStatus" INTEGER,
    "responseTimeMs" INTEGER,
    "zmqConnected" BOOLEAN,
    "dbOk" BOOLEAN,
    "lastTickAge" DOUBLE PRECISION,
    "raw" JSONB,
    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HealthCheck_vpsInstanceId_checkedAt_idx" ON "HealthCheck"("vpsInstanceId", "checkedAt");

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "licenseId" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_licenseId_createdAt_idx" ON "AuditLog"("licenseId", "createdAt");

-- CreateTable: Session
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jwtId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_jwtId_key" ON "Session"("jwtId");
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "License" ADD CONSTRAINT "License_vpsInstanceId_fkey" FOREIGN KEY ("vpsInstanceId") REFERENCES "VpsInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KillSwitchEvent" ADD CONSTRAINT "KillSwitchEvent_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HealthCheck" ADD CONSTRAINT "HealthCheck_vpsInstanceId_fkey" FOREIGN KEY ("vpsInstanceId") REFERENCES "VpsInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
