-- ChatLead.phone optional + Company settings centralization (2026-04-30)
--
-- Why: Pak Abdullah feedback — chat lead funnel friction terlalu tinggi
-- minta phone wajib di top-of-funnel. Cukup nama+email; phone tetap
-- dikumpulkan via Inquiry + register flow di mana user lebih commit.
--
-- Plus seed Brevo SMTP fallback values (encrypted via app-level — di sini
-- cuma key entry kosong supaya admin UI tahu setting belum diset).
-- Actual encrypted values di-input lewat /admin/cms/email-settings.
--
-- Idempotent: aman di-replay.

-- 1. Drop NOT NULL pada ChatLead.phone
ALTER TABLE "ChatLead" ALTER COLUMN "phone" DROP NOT NULL;

-- 2. (no-op) ChatLead.phone tetap di-index — index existing tetap valid
--    untuk row yang punya phone non-null. NULL phones tidak masuk index
--    (Postgres default behavior pada btree).
