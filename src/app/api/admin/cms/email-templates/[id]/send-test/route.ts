/**
 * Send test render dari email template ke alamat tertentu.
 *
 * POST { to: "...", locale: "id"|"en", vars: {...} }
 *   → render template dengan vars + send via Brevo.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { sendTemplatedEmail } from '@/lib/email/templates';
import { z } from 'zod';

const schema = z.object({
  to: z.string().email(),
  locale: z.enum(['id', 'en']).default('id'),
  vars: z.record(z.string(), z.string()).default({}),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;

  const tpl = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!tpl) return NextResponse.json({ code: 'not_found', error: 'template_not_found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await sendTemplatedEmail(parsed.data.to, tpl.slug, parsed.data.locale, parsed.data.vars, {
      skipUnsubHeader: true,
    });
    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ code: 'send_failed', error: msg }, { status: 502 });
  }
}
