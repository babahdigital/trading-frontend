-- Extend SubscriptionTier enum dengan rc29 5-tier crypto (CRYPTO_STARTER, CRYPTO_ACTIVE).
-- 2026-05-21 — register route schema previously rejected starter+active karena
-- DB enum cuma punya CRYPTO_BASIC/PRO/HNWI. Customer signup tier=CRYPTO_STARTER
-- gagal dengan validation_failed.
--
-- Same enum extended di CryptoSubscriptionTier (model CryptoBotSubscription)
-- via migration 20260521_crypto_tier_rc29. Both enums perlu starter+active
-- karena SubscriptionTier dipakai di Subscription model (general billing)
-- dan CryptoSubscriptionTier di CryptoBotSubscription (crypto-specific).
--
-- Postgres ALTER TYPE ADD VALUE non-destructive + idempotent.

ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'CRYPTO_STARTER';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'CRYPTO_ACTIVE';
