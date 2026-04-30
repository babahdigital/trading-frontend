/**
 * Admin user — read / update permissions / deactivate.
 *
 * PATCH = update permissions OR isActive. Cannot change email or role here
 * (delete + recreate if you need to flip role for security audit clarity).
 * DELETE = soft-delete via isActive=false (preserve audit trail).
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { createLogger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

const log = createLogger('api/admin/team/[id]');

interface ActorContext {
  userId: string;
  role: string;
  permissions: string[];
}

async function getActor(request: NextRequest): Promise<ActorContext | null> {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || !role) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, permissions: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  const perms = Array.isArray(user.permissions) ? (user.permissions as string[]) : [];
  return { userId: user.id, role: user.role, permissions: perms };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActor(request);
  if (!actor) {
    return NextResponse.json({ code: 'unauthorized', error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(actor.role, actor.permissions, PERMISSIONS.USERS_VIEW)) {
    return NextResponse.json({ code: 'forbidden', error: 'Insufficient permissions' }, { status: 403 });
  }
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      permissions: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });
  if (!user) return NextResponse.json({ code: 'not_found', error: 'User not found' }, { status: 404 });
  return NextResponse.json({ user });
}

const PatchSchema = z.object({
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActor(request);
  if (!actor) {
    return NextResponse.json({ code: 'unauthorized', error: 'Unauthorized' }, { status: 401 });
  }

  // Editing other users requires SUPER_ADMIN OR users.write permission.
  // Editing SELF (e.g., name change) is always allowed.
  const { id } = await params;
  const isSelf = id === actor.userId;

  if (!isSelf) {
    if (actor.role !== 'SUPER_ADMIN' && !hasPermission(actor.role, actor.permissions, PERMISSIONS.USERS_WRITE)) {
      return NextResponse.json({ code: 'forbidden', error: 'Insufficient permissions' }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'invalid_json', error: 'Invalid JSON body' }, { status: 400 });
  }
  const parse = PatchSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { code: 'invalid_payload', error: 'Validation failed', details: parse.error.issues },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!target) {
    return NextResponse.json({ code: 'not_found', error: 'User not found' }, { status: 404 });
  }

  // Defensive: SUPER_ADMIN cannot be edited via API. Bootstrap via DB SQL.
  if (target.role === 'SUPER_ADMIN') {
    return NextResponse.json(
      { code: 'super_admin_immutable', error: 'SUPER_ADMIN accounts are not editable via API' },
      { status: 403 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parse.data.permissions !== undefined && !isSelf) {
    updateData.permissions = parse.data.permissions as never;
  }
  if (parse.data.isActive !== undefined && !isSelf) {
    updateData.isActive = parse.data.isActive;
  }
  if (parse.data.name !== undefined) {
    updateData.name = parse.data.name;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ code: 'no_changes', error: 'No fields to update' }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        isActive: true,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: actor.userId,
          action: 'admin_team_update',
          metadata: {
            targetUserId: id,
            targetEmail: target.email,
            changes: parse.data,
          } as unknown as Prisma.InputJsonValue,
        },
      })
      .catch(() => undefined);

    return NextResponse.json({ user: updated });
  } catch (err) {
    log.error(`Team update failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ code: 'internal_error', error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActor(request);
  if (!actor) {
    return NextResponse.json({ code: 'unauthorized', error: 'Unauthorized' }, { status: 401 });
  }
  if (actor.role !== 'SUPER_ADMIN' && !hasPermission(actor.role, actor.permissions, PERMISSIONS.USERS_WRITE)) {
    return NextResponse.json({ code: 'forbidden', error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;
  if (id === actor.userId) {
    return NextResponse.json(
      { code: 'cannot_delete_self', error: 'Cannot deactivate your own account' },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ code: 'not_found', error: 'User not found' }, { status: 404 });
  }
  if (target.role === 'SUPER_ADMIN') {
    return NextResponse.json(
      { code: 'super_admin_immutable', error: 'SUPER_ADMIN accounts are not editable via API' },
      { status: 403 },
    );
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.auditLog
      .create({
        data: {
          userId: actor.userId,
          action: 'admin_user_deactivate',
          metadata: { targetUserId: id, targetEmail: target.email },
        },
      })
      .catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error(`User deactivate failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ code: 'internal_error', error: 'Failed to deactivate user' }, { status: 500 });
  }
}
