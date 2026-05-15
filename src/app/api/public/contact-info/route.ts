/**
 * Public contact info — backward-compat endpoint untuk footer existing.
 *
 * Sumber data: getCompanySettings() (cached 60s). Endpoint ini cuma reshape
 * jadi shape lama yang dipakai di EnterpriseFooter dan tempat lain.
 *
 * Untuk caller baru, prefer GET /api/public/company yang return full
 * CompanySettings shape.
 */
import { NextResponse } from 'next/server';
import { getCompanySettings } from '@/lib/company/settings';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const log = createLogger('api/public/contact-info');

export async function GET() {
  try {
    const c = await getCompanySettings();

    const wa = c.whatsappDigits.trim();
    const waUrl = wa ? `https://wa.me/${wa}` : null;

    return NextResponse.json({
      email: c.emailGeneral || 'hello@babahalgo.com',
      whatsappUrl: waUrl,
      whatsappLabel: waUrl ? 'WhatsApp' : null,
      telegramUrl: c.telegramUrl || null,
    });
  } catch (err) {
    log.warn(`contact-info read failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({
      email: 'hello@babahalgo.com',
      whatsappUrl: null,
      whatsappLabel: null,
      telegramUrl: 'https://t.me/babahalgo',
    });
  }
}
