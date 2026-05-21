-- Extend KycDocumentType enum with foreign-friendly types.
-- 2026-05-21 — KYC was Indo-centric (KTP/SIM/NPWP all Indonesia-specific +
-- PASSPORT only). Realistically not everyone has a passport, dan banyak
-- negara punya National ID Card sebagai primary identification.
--
-- Add 2 generic types:
--   - NATIONAL_ID    : foreign national ID card (US REAL ID, EU eID, India
--                       Aadhaar, Japanese zairyu, Singapore NRIC, etc)
--   - DRIVER_LICENSE : international driver license (non-Indo)
--
-- Postgres ALTER TYPE ADD VALUE is non-destructive + idempotent with
-- IF NOT EXISTS guard. Old rows tetap aman (KTP/SIM/NPWP/PASSPORT preserved).

ALTER TYPE "KycDocumentType" ADD VALUE IF NOT EXISTS 'NATIONAL_ID';
ALTER TYPE "KycDocumentType" ADD VALUE IF NOT EXISTS 'DRIVER_LICENSE';
