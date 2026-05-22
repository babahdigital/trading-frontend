/**
 * Admin Feature Flag API — GET list + POST set + DELETE remove.
 *
 * Auth: x-user-role header = 'ADMIN' (set by proxy middleware after JWT verify).
 * Use case: admin toggle features at runtime tanpa redeploy.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { listFeatureFlags, setFeatureFlag } from '@/lib/feature-flags';

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

function isAdmin(req: NextRequest): boolean {
  return req.headers.get('x-user-role') === 'ADMIN';
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const flags = await listFeatureFlags();
  return NextResponse.json({ ok: true, flags });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const body = await req.json();
  const { name, value, type } = body as { name?: string; value?: string; type?: 'boolean' | 'string' | 'number' | 'json' };
  if (!name || value === undefined) {
    return NextResponse.json({ error: 'name and value required' }, { status: 400 });
  }
  await setFeatureFlag(name, String(value), type ?? 'string');
  return NextResponse.json({ ok: true, name, value, type: type ?? 'string' });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const name = req.nextUrl.searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'name query param required' }, { status: 400 });
  const key = `feature:${name.toLowerCase()}`;
  await prisma.siteSetting.deleteMany({ where: { key } });
  return NextResponse.json({ ok: true, deleted: name });
}
