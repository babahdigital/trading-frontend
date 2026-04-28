import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/auth/reset-password');

// Returns { code, error } — frontend resolves via errors.auth.<code>.
function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ code, error: message }, { status });
}

const resetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      // Map common shape problems to specific i18n codes the FE understands.
      if (fieldErrors.password) {
        return errorResponse(
          'reset_password_too_short',
          'Password must be at least 8 characters.',
          400,
        );
      }
      return NextResponse.json(
        {
          code: 'validation_failed',
          error: 'Validation failed',
          fieldErrors,
        },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent');

    const tokenHash = sha256Hex(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!record) {
      return errorResponse('reset_invalid_token', 'Invalid reset link.', 400);
    }

    if (record.usedAt) {
      return errorResponse(
        'reset_token_used',
        'This reset link has already been used.',
        400,
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      return errorResponse(
        'reset_token_expired',
        'Reset link has expired.',
        400,
      );
    }

    const passwordHash = await hashPassword(password);

    // Atomically: update password, mark token used, audit log, kill all
    // active sessions so any in-flight access tokens lose database backing.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.deleteMany({ where: { userId: record.userId } }),
      prisma.auditLog.create({
        data: {
          userId: record.userId,
          action: 'password_reset_completed',
          ipAddress,
          userAgent,
          metadata: { tokenId: record.id },
        },
      }),
    ]);

    log.info(`Password reset completed for user ${record.userId}`);

    return NextResponse.json(
      {
        code: 'reset_success',
        message: 'Password reset. Please log in.',
      },
      { status: 200 },
    );
  } catch (error) {
    log.error('Reset password error:', error);
    return errorResponse('internal_error', 'Internal server error', 500);
  }
}
