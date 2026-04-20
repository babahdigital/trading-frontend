export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { decryptAdminToken } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/vps/seed');

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/vps/[id]/seed — Trigger seed generation on the customer VPS
 *
 * Calls the VPS backend `/api/admin/seed/generate` then stores the checksum.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const vps = await prisma.vpsInstance.findUnique({ where: { id } });
    if (!vps) {
      return NextResponse.json({ error: 'VPS instance not found' }, { status: 404 });
    }

    if (vps.status !== 'ONLINE') {
      return NextResponse.json(
        { error: 'VPS is not online', status: vps.status },
        { status: 503 }
      );
    }

    const adminToken = decryptAdminToken(
      vps.adminTokenCiphertext,
      vps.adminTokenIv,
      vps.adminTokenTag
    );

    // Trigger seed generation on the customer VPS
    const resp = await fetch(`${vps.backendBaseUrl}/api/admin/seed/generate`, {
      method: 'POST',
      headers: {
        'X-API-Token': adminToken,
        'User-Agent': 'vps2-fleet-manager/1.0',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      log.error(`Seed generation failed for ${vps.name}: ${resp.status} ${errBody}`);
      return NextResponse.json(
        { error: 'Seed generation failed on VPS', detail: errBody },
        { status: resp.status }
      );
    }

    const result = await resp.json();

    // Store checksum if returned
    if (result.checksum) {
      await prisma.vpsInstance.update({
        where: { id },
        data: { seedChecksum: result.checksum },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: request.headers.get('x-user-id'),
        action: 'vps_seed_generated',
        metadata: { vpsInstanceId: id, vpsName: vps.name, checksum: result.checksum ?? null },
      },
    });

    log.info(`Seed generated for VPS ${vps.name} (${id})`);

    return NextResponse.json({
      success: true,
      checksum: result.checksum ?? null,
      message: `Seed generated for ${vps.name}`,
    });
  } catch (error) {
    log.error('Seed generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/vps/[id]/seed — Proxy download the seed file from customer VPS
 *
 * Streams the seed binary from VPS backend and verifies SHA-256 checksum.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const vps = await prisma.vpsInstance.findUnique({ where: { id } });
    if (!vps) {
      return NextResponse.json({ error: 'VPS instance not found' }, { status: 404 });
    }

    if (vps.status !== 'ONLINE') {
      return NextResponse.json(
        { error: 'VPS is not online', status: vps.status },
        { status: 503 }
      );
    }

    const adminToken = decryptAdminToken(
      vps.adminTokenCiphertext,
      vps.adminTokenIv,
      vps.adminTokenTag
    );

    // Proxy download from VPS backend
    const resp = await fetch(`${vps.backendBaseUrl}/api/admin/seed/download`, {
      headers: {
        'X-API-Token': adminToken,
        'User-Agent': 'vps2-fleet-manager/1.0',
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: 'Seed download failed from VPS' },
        { status: resp.status }
      );
    }

    const seedBuffer = Buffer.from(await resp.arrayBuffer());

    // Compute SHA-256 checksum for verification
    const computedChecksum = createHash('sha256').update(seedBuffer).digest('hex');

    // Verify against stored checksum if available
    let checksumMatch: boolean | null = null;
    if (vps.seedChecksum) {
      checksumMatch = computedChecksum === vps.seedChecksum;
      if (!checksumMatch) {
        log.error(`Seed checksum mismatch for ${vps.name}: expected ${vps.seedChecksum}, got ${computedChecksum}`);
      }
    }

    // Update stored checksum
    await prisma.vpsInstance.update({
      where: { id },
      data: { seedChecksum: computedChecksum },
    });

    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="seed-${vps.name}.bin"`,
      'Content-Length': String(seedBuffer.byteLength),
      'X-Seed-Checksum': computedChecksum,
    });

    if (checksumMatch !== null) {
      headers.set('X-Checksum-Verified', String(checksumMatch));
    }

    return new Response(seedBuffer, { status: 200, headers });
  } catch (error) {
    log.error('Seed download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
