-- AlterTable
ALTER TABLE "VpsInstance" ADD COLUMN "seedUrl" TEXT,
ADD COLUMN "seedUrlExpiresAt" TIMESTAMP(3);
