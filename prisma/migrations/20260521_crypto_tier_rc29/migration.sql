-- Extend CryptoSubscriptionTier enum dengan tier rc29 (Starter + Active).
-- 2026-05-21 — backend rc38.1 + FE crypto pricing rc29 introduce 5-tier
-- pricing (demo/starter/active/pro/hnwi). DB enum sebelumnya cuma 3 tier
-- (BASIC/PRO/HNWI). Tambah STARTER + ACTIVE supaya tenant provisioning
-- + subscription activate route bisa persist tier yang benar.
--
-- BASIC preserved sebagai legacy alias (free_demo + grandfathered customers).
-- ALTER TYPE ADD VALUE non-destructive + idempotent.

ALTER TYPE "CryptoSubscriptionTier" ADD VALUE IF NOT EXISTS 'CRYPTO_STARTER';
ALTER TYPE "CryptoSubscriptionTier" ADD VALUE IF NOT EXISTS 'CRYPTO_ACTIVE';
