/**
 * PWA push subscription endpoint.
 *
 * 2026-05-20 — Phase 1 mobile prereq scaffold.
 * Browser-side: navigator.serviceWorker.register() → registration.pushManager.subscribe()
 * → POST { endpoint, keys.p256dh, keys.auth, topics } ke endpoint ini.
 *
 * Anonymous subscriber boleh subscribe (signal alert kategori publik
 * untuk free-tier reach). Authenticated subscriber dikaitkan ke userId
 * untuk personalized dispatch (kill-switch, margin call, payment).
 *
 * Idempotent — same endpoint → upsert (refresh keys + lastSeenAt).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('api/notifications/push/subscribe');

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  topics: z.array(z.string()).optional().default(['signal_alert']),
});

async function resolveOptionalUserId(request: NextRequest): Promise<string | null> {
  const cookieToken = request.cookies.get('access_token')?.value;
  if (!cookieToken) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(cookieToken, secret);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'bad_request', error: 'invalid_json' }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { endpoint, keys, topics } = parsed.data;
  const userId = await resolveOptionalUserId(request);
  const userAgent = request.headers.get('user-agent') ?? null;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  try {
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId,
        userAgent,
        ipAddress: ip,
        topics,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: userId ?? undefined,
        topics,
        lastSeenAt: new Date(),
        failedAttempts: 0,
      },
    });
    log.info(`push subscription stored id=${sub.id} userId=${userId ?? 'anon'} topics=${topics.join(',')}`);
    return NextResponse.json({ ok: true, id: sub.id }, { status: 201 });
  } catch (err) {
    log.error(`subscribe failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ code: 'internal_error', error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get('endpoint');
  if (!endpoint) {
    return NextResponse.json({ code: 'bad_request', error: 'endpoint_required' }, { status: 400 });
  }
  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error(`unsubscribe failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ code: 'internal_error', error: 'internal_error' }, { status: 500 });
  }
}
