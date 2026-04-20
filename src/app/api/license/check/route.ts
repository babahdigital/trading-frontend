export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/license/check');

const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes replay protection
const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 hours grace

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer_id');
  const signature = req.headers.get('x-signature');
  const timestamp = req.headers.get('x-timestamp');

  // 1. Verify required params
  if (!customerId || !signature || !timestamp) {
    return NextResponse.json(
      { valid: false, error: 'MISSING_PARAMS' },
      { status: 400 },
    );
  }

  // 2. Check timestamp window (5-min replay protection)
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > TIMESTAMP_WINDOW_MS) {
    return NextResponse.json(
      { valid: false, error: 'TIMESTAMP_EXPIRED' },
      { status: 401 },
    );
  }

  // 3. Verify HMAC signature
  const hmacSecret = process.env.LICENSE_HMAC_SECRET;
  if (!hmacSecret) {
    log.error('LICENSE_HMAC_SECRET not configured');
    return NextResponse.json(
      { valid: false, error: 'SERVER_CONFIG_ERROR' },
      { status: 500 },
    );
  }

  const payload = `${customerId}:${timestamp}`;
  const expected = crypto
    .createHmac('sha256', hmacSecret)
    .update(payload, 'utf8')
    .digest('hex');

  // Constant-time comparison
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json(
      { valid: false, error: 'INVALID_SIGNATURE' },
      { status: 401 },
    );
  }

  try {
    // 4. Lookup VpsInstance + active License
    const vps = await prisma.vpsInstance.findUnique({
      where: { customerCode: customerId },
      include: {
        licenses: {
          where: { status: 'ACTIVE' },
          orderBy: { expiresAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!vps || vps.licenses.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'LICENSE_NOT_FOUND' },
        { status: 404 },
      );
    }

    // 5. Check expiry + grace period
    const license = vps.licenses[0];
    const now = new Date();
    const expired = license.expiresAt < now;
    const gracePeriodExpires = new Date(license.expiresAt.getTime() + GRACE_PERIOD_MS);
    const inGrace = expired && now < gracePeriodExpires;

    return NextResponse.json({
      valid: !expired || inGrace,
      expires_at: license.expiresAt.toISOString(),
      in_grace_period: inGrace,
      grace_expires_at: gracePeriodExpires.toISOString(),
      tier: license.type,
      enabled_flags: (license.metadata as Record<string, unknown>)?.enabled_flags ?? {},
    });
  } catch (error) {
    log.error('License check DB error:', error);
    return NextResponse.json(
      { valid: false, error: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
