export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { decryptAdminToken } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth/require-admin';

const log = createLogger('api/admin/vps/code-version');

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/vps/[id]/code-version — Poll the customer VPS for its code version
 *
 * Calls `/code-version` on the VPS backend, stores the result, and compares
 * against the latest known version.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const guard = requireAdmin(request);
  if (guard) return guard;
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

    const resp = await fetch(`${vps.backendBaseUrl}/api/admin/customer-support/code-version`, {
      headers: {
        'X-API-Token': adminToken,
        'User-Agent': 'vps2-fleet-manager/1.0',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch code version from VPS' },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    const remoteVersion = data.version || data.code_version || null;

    // Persist the polled version
    if (remoteVersion) {
      await prisma.vpsInstance.update({
        where: { id },
        data: { codeVersion: remoteVersion },
      });
    }

    // Compare against latest known version (from env or most common version in fleet)
    const latestVersion = process.env.VPS_LATEST_CODE_VERSION || null;
    const isUpToDate = latestVersion ? remoteVersion === latestVersion : null;

    return NextResponse.json({
      vpsInstanceId: id,
      name: vps.name,
      codeVersion: remoteVersion,
      latestVersion,
      isUpToDate,
      raw: data,
    });
  } catch (error) {
    log.error('Code version check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
