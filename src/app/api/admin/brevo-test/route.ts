/**
 * Brevo email test endpoint — admin-gated smoke test.
 *
 * Send email test via Brevo (SMTP atau API tergantung config) ke target untuk
 * verify:
 * - Brevo credentials configured di /admin/cms/email-settings atau env
 * - SMTP/API transport reachable + responding OK
 * - Email delivered ke inbox target
 *
 * Pakai: POST /api/admin/brevo-test dengan ADMIN_TOKEN bearer auth.
 * Body: { to: "test@example.com", subject?: "Test", html?: "<p>..</p>" }
 *
 * Endpoint disabled (404) kalau ADMIN_TOKEN env tidak di-set.
 */
import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { sendEmail } from '@/lib/notifier/email';

const log = createLogger('api/admin/brevo-test');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const allowedToken = process.env.ADMIN_TOKEN || process.env.CRON_SECRET;
  if (!allowedToken) {
    return NextResponse.json({ code: 'not_found', error: 'Admin test disabled (ADMIN_TOKEN/CRON_SECRET unset)' }, { status: 404 });
  }

  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (provided !== allowedToken) {
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const to: string = body.to || '';
  const subject: string = body.subject || `[BabahAlgo Smoke Test] Brevo Email Integration ${new Date().toISOString()}`;
  const html: string = body.html || `
    <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;">
      <h2 style="color:#f59e0b;">BabahAlgo Email Smoke Test</h2>
      <p>Email integration via Brevo verified.</p>
      <p>Timestamp: <code>${new Date().toISOString()}</code></p>
      <hr style="border:none;border-top:1px solid #ccc;margin:20px 0;">
      <p style="color:#666;font-size:12px;">This is an admin smoke test. Safe to ignore.</p>
    </div>
  `;

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({
      ok: false,
      error: 'Invalid `to` — email address malformed',
    }, { status: 400 });
  }

  try {
    log.info(`Sending Brevo test to ${to}...`);
    const result = await sendEmail(to, { subject, html, skipUnsubHeader: true });

    return NextResponse.json({
      ok: true,
      message: 'Email test sent — cek inbox target untuk verify delivery',
      to,
      messageId: result.messageId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log.error('Brevo test threw', err);

    // Friendly hints untuk error pattern umum
    let hint: string | undefined;
    if (msg.includes('email_unconfigured')) {
      hint = 'Brevo SMTP/API credentials tidak di-set. Configure di /admin/cms/email-settings';
    } else if (msg.includes('email_disabled')) {
      hint = 'Email transport disabled di CompanySettings. Enable di /admin/cms/email-settings';
    } else if (msg.includes('connect') || msg.includes('ETIMEDOUT')) {
      hint = 'SMTP server unreachable — cek firewall outbound port 587 di VPS3';
    }

    return NextResponse.json({
      ok: false,
      error: msg,
      hint,
    }, { status: 500 });
  }
}

/**
 * GET — check Brevo configuration tanpa send email.
 */
export async function GET(req: Request) {
  const allowedToken = process.env.ADMIN_TOKEN || process.env.CRON_SECRET;
  if (!allowedToken) {
    return NextResponse.json({ code: 'not_found', error: 'Admin test disabled (ADMIN_TOKEN/CRON_SECRET unset)' }, { status: 404 });
  }

  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (provided !== allowedToken) {
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
  }

  // Inline config check tanpa import getEmailConfig untuk speed
  const smtpHost = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST;
  const smtpUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
  const smtpPass = process.env.BREVO_SMTP_PASSWORD || process.env.SMTP_PASSWORD;
  const apiKey = process.env.BREVO_API_KEY;

  return NextResponse.json({
    ok: true,
    brevoConfigured: !!(smtpUser && smtpPass) || !!apiKey,
    transport: {
      smtp: {
        configured: !!(smtpHost && smtpUser && smtpPass),
        host: smtpHost || null,
        user: smtpUser ? `${smtpUser.slice(0, 6)}...` : null,
      },
      api: {
        configured: !!apiKey,
        keyPreview: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : null,
      },
    },
    sendEndpoint: 'POST /api/admin/brevo-test { to: "...", subject?: "...", html?: "..." }',
  });
}
