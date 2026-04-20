export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/vps/seed');

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/vps/[id]/seed — Trigger seed dump on VPS1 master
 *
 * Calls VPS1 `/api/admin/customer-support/seed/dump` to generate a seed
 * package for the target customer VPS. Stores checksum + seed_url metadata.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const vps = await prisma.vpsInstance.findUnique({ where: { id } });
    if (!vps) {
      return NextResponse.json({ error: 'VPS instance not found' }, { status: 404 });
    }

    const daysMarketHistory = (body as Record<string, unknown>).days_market_history ?? 90;
    const daysAiBaseline = (body as Record<string, unknown>).days_ai_baseline ?? 30;

    // Call VPS1 master to generate seed (NOT the customer VPS)
    const resp = await proxyToMasterBackend('pamm', '/api/admin/customer-support/seed/dump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_vps_id: id,
        days_market_history: daysMarketHistory,
        days_ai_baseline: daysAiBaseline,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      log.error(`Seed dump failed for ${vps.name}: ${resp.status} ${errBody}`);
      return NextResponse.json(
        { error: 'Seed dump failed on VPS1 master', detail: errBody },
        { status: resp.status }
      );
    }

    const result = await resp.json() as Record<string, unknown>;

    // Store seed metadata
    const seedUrl = (result.seed_url as string) || null;
    const checksum = (result.checksum_sha256 as string) || (result.checksum as string) || null;
    const sizeMb = (result.size_mb as number) || null;
    const expiresAt = (result.expires_at as string) ? new Date(result.expires_at as string) : null;

    await prisma.vpsInstance.update({
      where: { id },
      data: {
        seedChecksum: checksum,
        seedUrl,
        seedUrlExpiresAt: expiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.headers.get('x-user-id'),
        action: 'vps_seed_generated',
        metadata: {
          vpsInstanceId: id,
          vpsName: vps.name,
          checksum,
          sizeMb,
          seedUrl: seedUrl ? '(stored)' : null,
        },
      },
    });

    log.info(`Seed generated for VPS ${vps.name} (${id}), checksum=${checksum}`);

    return NextResponse.json({
      success: true,
      seedUrl,
      checksum,
      sizeMb,
      expiresAt,
      message: `Seed generated for ${vps.name}`,
    });
  } catch (error) {
    log.error('Seed generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/vps/[id]/seed — Return stored seed metadata (URL + checksum)
 *
 * Returns the seed_url for admin to download directly.
 * Does NOT proxy the binary — seed_url points to VPS1/R2 pre-signed URL.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const vps = await prisma.vpsInstance.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        seedChecksum: true,
        seedUrl: true,
        seedUrlExpiresAt: true,
      },
    });

    if (!vps) {
      return NextResponse.json({ error: 'VPS instance not found' }, { status: 404 });
    }

    const isExpired = vps.seedUrlExpiresAt
      ? new Date() > vps.seedUrlExpiresAt
      : null;

    return NextResponse.json({
      vpsInstanceId: vps.id,
      name: vps.name,
      seedChecksum: vps.seedChecksum,
      seedUrl: vps.seedUrl,
      seedUrlExpiresAt: vps.seedUrlExpiresAt,
      isExpired,
      hasSeed: !!(vps.seedUrl && vps.seedChecksum),
    });
  } catch (error) {
    log.error('Seed info error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
