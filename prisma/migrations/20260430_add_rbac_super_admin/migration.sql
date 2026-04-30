-- RBAC Super-admin → Admin → Operator (2026-04-30)
--
-- Why: Pak Abdullah feedback — sebagai SUPER_ADMIN ingin bisa create
-- akun OPERATOR / ADMIN baru dengan scoped permissions. Schema before
-- only had ADMIN + CLIENT (binary).
--
-- Migration steps (idempotent, no data-loss):
-- 1. Add new enum values SUPER_ADMIN + OPERATOR (PG ALTER TYPE ADD VALUE)
-- 2. Add User.permissions JSON column (default [])
-- 3. Add User.createdById FK (self-relation)
-- 4. Add User.isActive flag (default true)
-- 5. NOTE: existing ADMIN rows tetap ADMIN — back-compat via empty
--    permissions array = full access semantics (di-handle di code,
--    bukan migration).

-- 1. Enum values — must be committed before reference, so each in its own statement
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OPERATOR';

-- 2. permissions array (JSONB recommended on Postgres 12+)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '[]';

-- 3. createdById self-reference + nullable FK
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

ALTER TABLE "User"
  DROP CONSTRAINT IF EXISTS "User_createdById_fkey";

ALTER TABLE "User"
  ADD CONSTRAINT "User_createdById_fkey"
  FOREIGN KEY ("createdById")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "User_createdById_idx"
  ON "User"("createdById");

-- 4. isActive soft-disable flag
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "User_isActive_idx"
  ON "User"("isActive");

-- 5. Backfill: any existing user with role='ADMIN' tetap ADMIN (back-compat).
--    Bootstrap super-admin manual via admin CLI atau langsung via psql:
--      UPDATE "User" SET role='SUPER_ADMIN' WHERE email='founder@babahalgo.com';
--    Tidak di-otomasi di sini supaya migration tidak nge-elevate akun random.
