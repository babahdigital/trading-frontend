-- AlterTable
ALTER TABLE "VpsInstance" ADD COLUMN "customerCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VpsInstance_customerCode_key" ON "VpsInstance"("customerCode");
