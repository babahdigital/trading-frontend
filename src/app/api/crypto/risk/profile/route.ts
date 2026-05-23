export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

/**
 * DEPRECATED — replaced by /api/crypto/leverage per Sprint X+1.2.
 * Risk parameters lain (max concurrent positions, daily loss limit, etc)
 * sekarang admin-runtime-config (operator-managed via /api/admin/config).
 */
export async function GET() {
  try {
  return NextResponse.json(
    {
      error: 'gone',
      message: 'Risk profile read pindah ke /api/crypto/leverage. Daily loss & concurrent position cap diatur operator.',
      redirect: '/api/crypto/leverage',
    },
    { status: 410 },
  );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
  return NextResponse.json(
    {
      error: 'gone',
      message: 'Risk profile update sudah tidak self-serve. PATCH leverage saja via /api/crypto/leverage.',
      redirect: '/api/crypto/leverage',
    },
    { status: 410 },
  );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
