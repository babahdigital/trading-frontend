-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('KTP', 'PASSPORT', 'SIM', 'NPWP');

-- CreateTable
CREATE TABLE "UserKyc" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "fullName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT DEFAULT 'ID',
    "occupation" TEXT,
    "sourceOfFunds" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'ID',
    "documentType" "KycDocumentType",
    "documentNumber" TEXT,
    "documentFrontUrl" TEXT,
    "documentBackUrl" TEXT,
    "selfieUrl" TEXT,
    "investmentExperience" TEXT,
    "riskTolerance" TEXT,
    "expectedMonthlyVolume" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKyc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserKyc_userId_key" ON "UserKyc"("userId");

-- CreateIndex
CREATE INDEX "UserKyc_status_submittedAt_idx" ON "UserKyc"("status", "submittedAt");

-- AddForeignKey
ALTER TABLE "UserKyc" ADD CONSTRAINT "UserKyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
