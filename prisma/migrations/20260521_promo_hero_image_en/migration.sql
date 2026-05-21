-- 2026-05-21 — Pak Abdullah directive: popup image juga multi-bahasa.
-- Tambah heroImageUrl_en field untuk versi English (saat ini FE pakai
-- heroImageUrl saja untuk both locale).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS nullable.

ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "heroImageUrl_en" TEXT;
