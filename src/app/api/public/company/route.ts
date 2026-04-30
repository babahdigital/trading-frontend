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
  const settings = await getCompanySettings();
  return NextResponse.json(settings);
}
