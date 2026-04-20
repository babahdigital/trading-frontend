-- AlterTable
ALTER TABLE "VpsInstance" ADD COLUMN "syncTokenCiphertext" TEXT,
ADD COLUMN "syncTokenIv" TEXT,
ADD COLUMN "syncTokenTag" TEXT,
ADD COLUMN "codeVersion" TEXT,
ADD COLUMN "lastSyncStatus" TEXT,
ADD COLUMN "lastSyncAt" TIMESTAMP(3),
ADD COLUMN "seedChecksum" TEXT;
