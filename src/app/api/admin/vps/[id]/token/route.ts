export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { encryptAdminToken, decryptAdminToken } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/vps/token');

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/vps/[id]/token — Mint a new sync token
 *
 * 1. Call the customer VPS to generate a new API token
 * 2. Encrypt the token with AES-256-GCM
 * 3. Store encrypted fields in VpsInstance.syncToken*
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { syncToken } = body;

    if (!syncToken || typeof syncToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: syncToken' },
        { status: 400 }
      );
    }

    const vps = await prisma.vpsInstance.findUnique({ where: { id } });
    if (!vps) {
      return NextResponse.json({ error: 'VPS instance not found' }, { status: 404 });
    }

    // Encrypt the sync token with AES-256-GCM (same master key as admin tokens)
    const { ciphertext, iv, tag } = encryptAdminToken(syncToken);

    await prisma.vpsInstance.update({
      where: { id },
      data: {
        syncTokenCiphertext: ciphertext,
        syncTokenIv: iv,
        syncTokenTag: tag,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.headers.get('x-user-id'),
        action: 'vps_sync_token_minted',
        metadata: { vpsInstanceId: id, vpsName: vps.name },
      },
    });

    log.info(`Sync token minted for VPS ${vps.name} (${id})`);

    return NextResponse.json({
      success: true,
      message: `Sync token minted for ${vps.name}`,
    });
  } catch (error) {
    log.error('Mint sync token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/vps/[id]/token — Revoke the sync token
 *
 * Clears the encrypted sync token fields from VpsInstance.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const vps = await prisma.vpsInstance.findUnique({ where: { id } });
    if (!vps) {
      return NextResponse.json({ error: 'VPS instance not found' }, { status: 404 });
    }

    if (!vps.syncTokenCiphertext) {
      return NextResponse.json({ error: 'No sync token to revoke' }, { status: 400 });
    }

    await prisma.vpsInstance.update({
      where: { id },
      data: {
        syncTokenCiphertext: null,
        syncTokenIv: null,
        syncTokenTag: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.headers.get('x-user-id'),
        action: 'vps_sync_token_revoked',
        metadata: { vpsInstanceId: id, vpsName: vps.name },
      },
    });

    log.info(`Sync token revoked for VPS ${vps.name} (${id})`);

    return NextResponse.json({
      success: true,
      message: `Sync token revoked for ${vps.name}`,
    });
  } catch (error) {
    log.error('Revoke sync token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/vps/[id]/token — Check sync token status (does NOT expose the token)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const vps = await prisma.vpsInstance.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        syncTokenCiphertext: true,
        syncTokenIv: true,
        syncTokenTag: true,
      },
    });

    if (!vps) {
      return NextResponse.json({ error: 'VPS instance not found' }, { status: 404 });
    }

    const hasSyncToken = !!(vps.syncTokenCiphertext && vps.syncTokenIv && vps.syncTokenTag);

    // Verify token is decryptable (integrity check) without exposing it
    let tokenValid = false;
    if (hasSyncToken) {
      try {
        decryptAdminToken(vps.syncTokenCiphertext!, vps.syncTokenIv!, vps.syncTokenTag!);
        tokenValid = true;
      } catch {
        tokenValid = false;
      }
    }

    return NextResponse.json({
      vpsInstanceId: vps.id,
      name: vps.name,
      hasSyncToken,
      tokenValid,
    });
  } catch (error) {
    log.error('Check sync token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
