-- Add SEO metadata columns to Article
ALTER TABLE "Article" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "Article" ADD COLUMN "metaTitle_en" TEXT;
ALTER TABLE "Article" ADD COLUMN "metaDescription" TEXT;
ALTER TABLE "Article" ADD COLUMN "metaDescription_en" TEXT;
ALTER TABLE "Article" ADD COLUMN "keywords" JSONB NOT NULL DEFAULT '[]';
