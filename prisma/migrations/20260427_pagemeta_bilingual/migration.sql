-- Zero-touch i18n: add bilingual EN columns + en_synced_at staleness tracker
-- to PageMeta. Worker translates ID source → EN columns on next 5-min tick.

ALTER TABLE "PageMeta" ADD COLUMN "title_en" TEXT;
ALTER TABLE "PageMeta" ADD COLUMN "description_en" TEXT;
ALTER TABLE "PageMeta" ADD COLUMN "ogTitle_en" TEXT;
ALTER TABLE "PageMeta" ADD COLUMN "ogDescription_en" TEXT;
ALTER TABLE "PageMeta" ADD COLUMN "en_synced_at" TIMESTAMP(3);

CREATE INDEX "PageMeta_en_synced_at_idx" ON "PageMeta"("en_synced_at");

-- Bootstrap: rows with title_en already populated (from initial seed
-- or admin manual entry) get en_synced_at = updatedAt. NULL en_synced_at
-- on others triggers worker translation on first tick.
UPDATE "PageMeta"
SET "en_synced_at" = "updatedAt"
WHERE "title_en" IS NOT NULL;
