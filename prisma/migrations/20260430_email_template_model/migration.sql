-- EmailTemplate model + seed default templates (2026-04-30)
--
-- Why: Pak Abdullah minta template welcome user + email lainnya bisa di-edit
-- di admin. Pisahkan dari kode supaya non-engineer bisa update copy + branding
-- tanpa redeploy.
--
-- Idempotent: aman di-replay (IF NOT EXISTS, ON CONFLICT DO NOTHING).

-- 1. Table
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id"          TEXT          NOT NULL,
  "slug"        TEXT          NOT NULL,
  "name"        TEXT          NOT NULL,
  "description" TEXT,
  "variables"   JSONB         NOT NULL DEFAULT '[]',
  "subject_id"  TEXT          NOT NULL,
  "subject_en"  TEXT          NOT NULL,
  "body_id"     TEXT          NOT NULL,
  "body_en"     TEXT          NOT NULL,
  "text_id"     TEXT,
  "text_en"     TEXT,
  "isActive"    BOOLEAN       NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_slug_key" ON "EmailTemplate"("slug");

-- 2. Seed default templates
INSERT INTO "EmailTemplate" ("id", "slug", "name", "description", "variables", "subject_id", "subject_en", "body_id", "body_en", "text_id", "text_en", "isActive", "createdAt", "updatedAt")
VALUES
  (
    'tpl_welcome_user_default',
    'welcome_user',
    'Welcome User',
    'Email selamat datang setelah register akun customer',
    '["user_name", "user_email", "site_url", "company_name"]'::jsonb,
    'Selamat datang di {{company_name}}',
    'Welcome to {{company_name}}',
    '<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a;"><div style="border:1px solid #e5e5e5;border-radius:12px;padding:32px;background:#fafafa"><h1 style="font-size:22px;margin:0 0 16px;color:#f59e0b">Selamat Datang, {{user_name}}!</h1><p>Akun Anda di {{company_name}} sudah aktif. Anda bisa langsung mulai eksplorasi dashboard dan fitur trading kami.</p><p><a href="{{site_url}}/portal" style="display:inline-block;padding:10px 24px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Buka Portal</a></p><p style="font-size:13px;color:#666;margin-top:24px">Email akun Anda: <code>{{user_email}}</code></p></div></body></html>',
    '<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a;"><div style="border:1px solid #e5e5e5;border-radius:12px;padding:32px;background:#fafafa"><h1 style="font-size:22px;margin:0 0 16px;color:#f59e0b">Welcome, {{user_name}}!</h1><p>Your {{company_name}} account is active. You can start exploring the dashboard and trading features right away.</p><p><a href="{{site_url}}/portal" style="display:inline-block;padding:10px 24px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Open Portal</a></p><p style="font-size:13px;color:#666;margin-top:24px">Account email: <code>{{user_email}}</code></p></div></body></html>',
    'Halo {{user_name}}, akun Anda di {{company_name}} sudah aktif. Buka portal: {{site_url}}/portal',
    'Hi {{user_name}}, your {{company_name}} account is active. Open portal: {{site_url}}/portal',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tpl_password_reset_default',
    'password_reset',
    'Password Reset',
    'Reset password link saat user lupa password',
    '["user_name", "reset_url", "company_name"]'::jsonb,
    'Reset password {{company_name}}',
    'Reset your {{company_name}} password',
    '<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a;"><div style="border:1px solid #e5e5e5;border-radius:12px;padding:32px;background:#fafafa"><h1 style="font-size:22px;margin:0 0 16px;color:#f59e0b">Reset Password</h1><p>Halo {{user_name}}, Anda meminta reset password untuk akun {{company_name}} Anda. Klik link berikut untuk lanjutkan:</p><p><a href="{{reset_url}}" style="display:inline-block;padding:10px 24px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Reset Password</a></p><p style="font-size:13px;color:#666;margin-top:24px">Link berlaku 30 menit. Jika Anda tidak meminta reset ini, abaikan email.</p></div></body></html>',
    '<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a;"><div style="border:1px solid #e5e5e5;border-radius:12px;padding:32px;background:#fafafa"><h1 style="font-size:22px;margin:0 0 16px;color:#f59e0b">Reset Password</h1><p>Hi {{user_name}}, you requested a password reset for your {{company_name}} account. Click the link below to continue:</p><p><a href="{{reset_url}}" style="display:inline-block;padding:10px 24px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Reset Password</a></p><p style="font-size:13px;color:#666;margin-top:24px">Link valid for 30 minutes. Ignore this email if you did not request a reset.</p></div></body></html>',
    'Halo {{user_name}}, klik link untuk reset password: {{reset_url}} (berlaku 30 menit)',
    'Hi {{user_name}}, click the link to reset your password: {{reset_url}} (valid 30 minutes)',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tpl_lead_confirmation_default',
    'lead_confirmation',
    'Chat Lead Confirmation',
    'Email konfirmasi setelah calon customer submit chat lead form',
    '["user_name", "site_url", "company_name"]'::jsonb,
    'Terima kasih sudah menghubungi {{company_name}}',
    'Thanks for reaching out to {{company_name}}',
    '<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a;"><div style="border:1px solid #e5e5e5;border-radius:12px;padding:32px;background:#fafafa"><h1 style="font-size:22px;margin:0 0 16px;color:#f59e0b">Halo {{user_name}}!</h1><p>Terima kasih sudah menghubungi {{company_name}}. Tim kami akan menindaklanjuti dalam 1x24 jam.</p><p>Sambil menunggu, Anda bisa eksplorasi materi kami:</p><ul><li><a href="{{site_url}}/research">Riset & Pair Briefs</a></li><li><a href="{{site_url}}/pricing">Pricing</a></li><li><a href="{{site_url}}/demo">Demo Gratis 7 Hari</a></li></ul></div></body></html>',
    '<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a;"><div style="border:1px solid #e5e5e5;border-radius:12px;padding:32px;background:#fafafa"><h1 style="font-size:22px;margin:0 0 16px;color:#f59e0b">Hi {{user_name}}!</h1><p>Thanks for reaching out to {{company_name}}. Our team will follow up within 1 business day.</p><p>While you wait, explore our materials:</p><ul><li><a href="{{site_url}}/research">Research & Pair Briefs</a></li><li><a href="{{site_url}}/pricing">Pricing</a></li><li><a href="{{site_url}}/demo">Free 7-Day Demo</a></li></ul></div></body></html>',
    'Terima kasih, {{user_name}}. Tim kami akan menindaklanjuti dalam 1x24 jam.',
    'Thanks, {{user_name}}. Our team will follow up within 1 business day.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("slug") DO NOTHING;
