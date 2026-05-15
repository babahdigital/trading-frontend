/**
 * Sentry trigger test endpoint — admin-only, gated dengan ADMIN_TOKEN.
 *
 * Untuk verifikasi pipeline Sentry → notifikasi (Slack / email integration).
 * Tidak ada side effect production: hanya throw a tagged exception yang
 * Sentry.captureException auto-capture lewat @sentry/nextjs withSentryConfig.
 *
 * Pakai: curl -H "Authorization: Bearer $ADMIN_TOKEN" \
 *          https://babahalgo.com/api/admin/sentry-test
 *
 * Kalau ADMIN_TOKEN tidak di-set di env, endpoint disabled (404).
 */
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const allowedToken = process.env.ADMIN_TOKEN || process.env.CRON_SECRET;
  if (!allowedToken) {
    return NextResponse.json({ error: 'Sentry test disabled (ADMIN_TOKEN/CRON_SECRET unset)' }, { status: 404 });
  }

  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (provided !== allowedToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Tagged exception — supaya gampang difilter di Sentry UI.
  const err = new Error('Sentry trigger test — intentional from /api/admin/sentry-test');
  Sentry.captureException(err, {
    tags: { source: 'admin-sentry-test', intentional: 'true' },
    level: 'info',
  });

  return NextResponse.json({
    ok: true,
    message: 'Sentry exception captured (check Sentry dashboard for event).',
    sentryConfigured: !!process.env.SENTRY_DSN,
    eventTags: { source: 'admin-sentry-test', intentional: 'true' },
  });
}
