-- Tambah CANCELLED value ke LicenseStatus enum untuk distinguish user-initiated
-- cancel (via Stripe subscription.deleted, Midtrans cancel/expire, Xendit
-- expired) dari REVOKED (admin-initiated revoke) dan EXPIRED (passive timeout).
--
-- 2026-05-21 — backend rc37 chain shipped cancel/downgrade webhook handlers
-- yang propagate ke FE via subscription/lifecycle.ts cancelSubscription().
--
-- Postgres ALTER TYPE ADD VALUE non-destructive + idempotent dengan IF NOT EXISTS.

ALTER TYPE "LicenseStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
