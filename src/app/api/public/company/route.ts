/**
 * Public company info — full CompanySettings shape.
 *
 * Dipakai di footer rich (alamat, social), halaman /contact (compliance
 * email, support email), halaman /legal/* (legal entity, address), dst.
 *
 * Cache: 60s in-memory di lib/company/settings — admin update terlihat
 * dalam ~1 menit.
 */
import { NextResponse } from 'next/server';
import { getCompanySettings } from '@/lib/company/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
  const settings = await getCompanySettings();
  return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
