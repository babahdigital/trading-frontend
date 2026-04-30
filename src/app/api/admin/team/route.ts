/**
 * Admin team RBAC — list + create operator/admin accounts.
 *
 * Distinct dari /api/admin/users (legacy customer user CRUD). This namespace
 * is dedicated to team RBAC: SUPER_ADMIN, ADMIN, OPERATOR with permissions.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { createLogger } from '@/lib/logger';
import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';

const log = createLogger('api/admin/team');

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

export async function GET(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor) {
    return NextResponse.json({ code: 'unauthorized', error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(actor.role, actor.permissions, PERMISSIONS.USERS_VIEW)) {
    return NextResponse.json({ code: 'forbidden', error: 'Insufficient permissions' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'] } },
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
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ users });
}

const CreateUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['ADMIN', 'OPERATOR']),
  permissions: z.array(z.string()).default([]),
});

function generateInitialPassword(): string {
  // 16-char URL-safe base64, ~96 bits entropy. Easy to share via secure channel.
  return randomBytes(12).toString('base64url');
}

export async function POST(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor) {
    return NextResponse.json({ code: 'unauthorized', error: 'Unauthorized' }, { status: 401 });
  }

  // Creating admin/operator akun di-kunci ke SUPER_ADMIN (atau ADMIN dengan
  // explicit USERS_CREATE permission yang biasanya tidak di-grant).
  if (actor.role !== 'SUPER_ADMIN' && !hasPermission(actor.role, actor.permissions, PERMISSIONS.USERS_CREATE)) {
    return NextResponse.json(
      { code: 'forbidden', error: 'Only SUPER_ADMIN can create new operator accounts' },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'invalid_json', error: 'Invalid JSON body' }, { status: 400 });
  }

  const parse = CreateUserSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { code: 'invalid_payload', error: 'Validation failed', details: parse.error.issues },
      { status: 400 },
    );
  }

  const { email, name, role, permissions } = parse.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ code: 'email_taken', error: 'Email already in use' }, { status: 409 });
  }

  const initialPassword = generateInitialPassword();
  const passwordHash = await hashPassword(initialPassword);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        passwordHash,
        role,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        createdById: actor.userId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: actor.userId,
          action: 'admin_team_create',
          metadata: {
            createdUserId: user.id,
            createdEmail: user.email,
            createdRole: user.role,
            permissionsGranted: permissions,
          } as unknown as Prisma.InputJsonValue,
        },
      })
      .catch(() => undefined);

    return NextResponse.json(
      {
        user,
        // Plaintext password — show ONCE, force operator change on first login.
        initialPassword,
      },
      { status: 201 },
    );
  } catch (err) {
    log.error(`Team create failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ code: 'internal_error', error: 'Failed to create user' }, { status: 500 });
  }
}
