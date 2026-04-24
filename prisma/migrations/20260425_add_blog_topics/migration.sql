-- Add new ArticleCategory values used by BlogTopic catalog
ALTER TYPE "ArticleCategory" ADD VALUE IF NOT EXISTS 'EDUCATION';
ALTER TYPE "ArticleCategory" ADD VALUE IF NOT EXISTS 'CASE_STUDY';
ALTER TYPE "ArticleCategory" ADD VALUE IF NOT EXISTS 'COMPLIANCE';

-- CreateEnum AssetClass
CREATE TYPE "AssetClass" AS ENUM ('FOREX', 'CRYPTO', 'MULTI');

-- CreateEnum BlogTopicStatus
CREATE TYPE "BlogTopicStatus" AS ENUM ('PENDING', 'GENERATING', 'GENERATED', 'PUBLISHED', 'FAILED', 'DISABLED');

-- CreateTable BlogTopic
CREATE TABLE "BlogTopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "excerptId" TEXT NOT NULL,
    "excerptEn" TEXT NOT NULL,
    "promptTemplate" TEXT NOT NULL,
    "dataSources" JSONB NOT NULL DEFAULT '[]',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "category" "ArticleCategory" NOT NULL DEFAULT 'EDUCATION',
    "assetClass" "AssetClass" NOT NULL DEFAULT 'FOREX',
    "targetLengthWords" INTEGER NOT NULL DEFAULT 1500,
    "scheduledWeek" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "BlogTopicStatus" NOT NULL DEFAULT 'PENDING',
    "lastGeneratedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "aiModel" TEXT,
    "aiTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "articleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoPublish" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogTopic_slug_key" ON "BlogTopic"("slug");
CREATE UNIQUE INDEX "BlogTopic_articleId_key" ON "BlogTopic"("articleId");
CREATE INDEX "BlogTopic_status_scheduledWeek_idx" ON "BlogTopic"("status", "scheduledWeek");
CREATE INDEX "BlogTopic_isActive_priority_idx" ON "BlogTopic"("isActive", "priority");
CREATE INDEX "BlogTopic_assetClass_isActive_idx" ON "BlogTopic"("assetClass", "isActive");

-- AddForeignKey
ALTER TABLE "BlogTopic" ADD CONSTRAINT "BlogTopic_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
