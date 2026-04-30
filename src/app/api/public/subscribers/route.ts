/**
 * Newsletter subscriber capture (public).
 *
 * Tujuan: distribusi research harian + product update via email. Calon
 * subscriber bisa daftar via:
 *   - Footer form (source=FOOTER)
 *   - Inline blog/research CTA (source=RESEARCH_INLINE)
 *   - Exit-intent modal (source=EXIT_INTENT)
 *   - Auto-subscribe dari chat-lead opt-in (handled di /api/chat/lead, tidak lewat sini)
 *
 * Idempotent upsert by email — kirim ulang form tidak crash, hanya update
 * locale/source/status.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('api/public/subscribers');

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('email_invalid'),
  name: z.string().trim().max(80).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9]{8,15})$/, 'phone_invalid')
    .optional(),
  locale: z.enum(['id', 'en']).optional().default('id'),
  source: z.enum(['FOOTER', 'CONTACT_FORM', 'RESEARCH_INLINE', 'EXIT_INTENT']).optional().default('FOOTER'),
});

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

  try {
    const subscriber = await prisma.subscriber.upsert({
      where: { email: parsed.data.email },
      update: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        locale: parsed.data.locale,
        // Kalau sebelumnya UNSUBSCRIBED, re-aktifkan; BOUNCED tetap BOUNCED
        // sampai admin manual cleanup (tidak otomatis untuk hindari spam loop)
        status: 'ACTIVE',
      },
      create: {
        email: parsed.data.email,
        name: parsed.data.name,
        phone: parsed.data.phone,
        locale: parsed.data.locale,
        source: parsed.data.source,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({ success: true, id: subscriber.id }, { status: 201 });
  } catch (err) {
    log.error(`subscribe failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
