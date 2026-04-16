-- AlterTable: Add English translation columns for i18n
ALTER TABLE "LandingSection" ADD COLUMN "title_en" TEXT;
ALTER TABLE "LandingSection" ADD COLUMN "subtitle_en" TEXT;
ALTER TABLE "LandingSection" ADD COLUMN "content_en" JSONB;

ALTER TABLE "PricingTier" ADD COLUMN "name_en" TEXT;
ALTER TABLE "PricingTier" ADD COLUMN "subtitle_en" TEXT;
ALTER TABLE "PricingTier" ADD COLUMN "features_en" JSONB;
ALTER TABLE "PricingTier" ADD COLUMN "ctaLabel_en" TEXT;

ALTER TABLE "Faq" ADD COLUMN "question_en" TEXT;
ALTER TABLE "Faq" ADD COLUMN "answer_en" TEXT;
