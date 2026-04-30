/**
 * Newsletter unsubscribe — token-based (preferred) atau email fallback.
 *
 * Token-based (link di email body): /api/public/unsubscribe?token=xxxx
 *   → cari Subscriber by unsubToken, set status=UNSUBSCRIBED. Aman karena
 *   token unique cuid, tidak bisa di-guess.
 *
 * Email fallback (untuk header List-Unsubscribe RFC 8058):
 *   POST { email } atau GET ?email=xxx@y.com → mark Subscriber UNSUBSCRIBED
 *   + remove EMAIL channel dari NotificationPreference (legacy customer
 *   yang punya akun User).
 *
 * Tidak leak existence: sukses 200 baik subscriber ada atau tidak.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const log = createLogger('api/public/unsubscribe');

async function processUnsubscribe(token: string | null, email: string | null) {
  // Token path (preferred — secure, no email enumeration)
  if (token) {
    const subscriber = await prisma.subscriber
      .findUnique({ where: { unsubToken: token } })
      .catch(() => null);
    if (subscriber && subscriber.status !== 'UNSUBSCRIBED') {
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: 'UNSUBSCRIBED' },
      });
      log.info(`unsubscribed via token: ${subscriber.email}`);
    }
    return;
  }

  // Email fallback path
  if (email) {
    const lowerEmail = email.trim().toLowerCase();

    // Mark Subscriber UNSUBSCRIBED (kalau ada)
    await prisma.subscriber
      .update({
        where: { email: lowerEmail },
        data: { status: 'UNSUBSCRIBED' },
      })
      .catch(() => {
        // Tidak ada Subscriber row — fine
      });

    // Legacy: kalau user adalah customer dengan akun User, remove EMAIL
    // channel dari NotificationPreference juga.
    const user = await prisma.user.findUnique({ where: { email: lowerEmail } });
    if (user) {
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: user.id },
      });
      if (pref) {
        const channels = (pref.channels as string[]).filter((c) => c !== 'EMAIL');
        await prisma.notificationPreference.update({
          where: { userId: user.id },
          data: { channels },
        });
      }
    }
  }
}

export async function POST(req: NextRequest) {
  let body: { email?: string; token?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Body kosong OK kalau token via query
  }
  const { searchParams } = req.nextUrl;
  const token = body.token ?? searchParams.get('token');
  const email = body.email ?? searchParams.get('email');

  if (!token && !email) {
    return NextResponse.json({ error: 'token_or_email_required' }, { status: 400 });
  }

  await processUnsubscribe(token, email);
  return NextResponse.json({ ok: true });
}

// GET handler — untuk one-click unsubscribe dari link email (RFC 8058).
// Browser nge-load URL → endpoint balas dengan redirect ke landing page
// confirmation supaya user dapat visual feedback.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token && !email) {
    return NextResponse.json({ error: 'token_or_email_required' }, { status: 400 });
  }

  await processUnsubscribe(token, email);

  // Redirect ke confirmation page (locale-aware via cookie)
  const cookieHeader = req.headers.get('cookie') ?? '';
  const localeMatch = cookieHeader.match(/(?:^|;\s*)NEXT_LOCALE=(id|en)/);
  const locale = localeMatch?.[1] ?? 'id';
  const url = new URL(`/${locale}/unsubscribe`, req.nextUrl.origin);
  url.searchParams.set('done', '1');
  return NextResponse.redirect(url, 302);
}
