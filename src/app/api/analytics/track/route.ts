/**
 * Lightweight self-hosted analytics ingestion.
 *
 * 2026-05-20 — Phase A polish (PMF measurement). Privacy-first:
 * IP di-hash SHA256 sebelum store (no raw IP retention). User
 * identifikasi opsional dari JWT cookie. Session ID di-generate
 * client-side (UUID v4, simpan di sessionStorage).
 *
 * Beam-and-forget — endpoint return 204 cepat untuk minimal latency
 * impact pada page load. Failed inserts di-log tapi tidak return error.
 *
 * Rate limit: ditangani via middleware global 100/min/IP (no per-route).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('api/analytics/track');

const EVENT_TYPES = [
  'pageview',
  'cta_click',
  'register_start',
  'register_step',
  'register_complete',
  'checkout_start',
  'checkout_success',
  'engagement',
] as const;

const trackSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  path: z.string().max(500).optional(),
  referrer: z.string().max(1000).optional(),
  sessionId: z.string().max(64).optional(),
  utmSource: z.string().max(64).optional(),
  utmMedium: z.string().max(64).optional(),
  utmCampaign: z.string().max(128).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

async function resolveUserId(request: NextRequest): Promise<string | null> {
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
    return new NextResponse(null, { status: 204 }); // beam-and-forget silent reject
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse(null, { status: 204 });
  }

  const data = parsed.data;
  const userId = await resolveUserId(request);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ipHash = ip
    ? createHash('sha256').update(ip + (process.env.ANALYTICS_IP_SALT ?? 'babahalgo-salt')).digest('hex').slice(0, 32)
    : null;
  const country = request.headers.get('cf-ipcountry')?.toUpperCase() ?? null;
  const userAgent = request.headers.get('user-agent') ?? null;

  // Fire-and-forget insert — don't await
  prisma.analyticsEvent
    .create({
      data: {
        eventType: data.eventType,
        path: data.path,
        referrer: data.referrer,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        sessionId: data.sessionId,
        userId,
        metadata: (data.metadata ?? {}) as import('@prisma/client').Prisma.InputJsonValue,
        ipHash,
        userAgent,
        country,
      },
    })
    .catch((err) => log.warn(`analytics insert failed: ${err instanceof Error ? err.message : 'unknown'}`));

  return new NextResponse(null, { status: 204 });
}
