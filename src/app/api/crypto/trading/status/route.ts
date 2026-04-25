export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

/**
 * DEPRECATED — folded into /api/crypto/overview per Sprint X+1.2.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'gone',
      message: 'Endpoint pindah ke /api/crypto/overview yang menggabungkan equity, posisi, status kill switch.',
      redirect: '/api/crypto/overview',
    },
    { status: 410 },
  );
}
