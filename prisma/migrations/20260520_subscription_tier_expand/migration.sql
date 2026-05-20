-- Add FREE + CRYPTO_* values to SubscriptionTier enum.
-- 2026-05-20 — unified /register?service=X refactor needs these tiers
-- (previously schema rejected crypto signups + free tier signups silently
-- via Prisma enum validation despite Zod schema saying they're valid).
--
-- Postgres ALTER TYPE ... ADD VALUE is non-destructive — old rows unaffected.
-- IF NOT EXISTS guard makes migration idempotent.

ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'FREE';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'CRYPTO_BASIC';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'CRYPTO_PRO';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'CRYPTO_HNWI';
