-- Zero-touch i18n: add en_synced_at timestamp to track when each row's
-- *_en translation was last synced from the source. Worker compares
-- against `updatedAt` to detect stale translations and retranslate.

ALTER TABLE "Faq" ADD COLUMN "en_synced_at" TIMESTAMP(3);
CREATE INDEX "Faq_en_synced_at_idx" ON "Faq"("en_synced_at");

ALTER TABLE "PricingTier" ADD COLUMN "en_synced_at" TIMESTAMP(3);
CREATE INDEX "PricingTier_en_synced_at_idx" ON "PricingTier"("en_synced_at");

ALTER TABLE "LandingSection" ADD COLUMN "en_synced_at" TIMESTAMP(3);
CREATE INDEX "LandingSection_en_synced_at_idx" ON "LandingSection"("en_synced_at");

ALTER TABLE "Article" ADD COLUMN "en_synced_at" TIMESTAMP(3);
CREATE INDEX "Article_en_synced_at_idx" ON "Article"("en_synced_at");

-- Bootstrap: rows that already have *_en populated get en_synced_at = updatedAt
-- so the worker doesn't immediately retranslate them. Rows with NULL *_en
-- columns get NULL en_synced_at, which the worker treats as "needs translation".
UPDATE "Faq"
SET "en_synced_at" = "updatedAt"
WHERE "question_en" IS NOT NULL AND "answer_en" IS NOT NULL;

UPDATE "PricingTier"
SET "en_synced_at" = "updatedAt"
WHERE "name_en" IS NOT NULL;

UPDATE "LandingSection"
SET "en_synced_at" = "updatedAt"
WHERE "title_en" IS NOT NULL;

UPDATE "Article"
SET "en_synced_at" = "updatedAt"
WHERE "title_en" IS NOT NULL AND "body_en" IS NOT NULL;
