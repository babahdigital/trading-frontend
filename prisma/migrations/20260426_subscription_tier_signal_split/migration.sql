-- Add canonical tier values to SubscriptionTier enum
-- Per audit 2026-04-26: Signal pricing pivot from $49/$149 (2-tier) to
-- $19 Starter / $79 Pro / $299 VIP (3-tier) + free DEMO. PAMM tiers
-- retained as legacy for existing rows but deprecated for new registrations.

-- AlterEnum: PostgreSQL requires ALTER TYPE ... ADD VALUE per value
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'DEMO';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'SIGNAL_STARTER';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'SIGNAL_PRO';
