export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

/**
 * DEPRECATED — strategy enrollment moved to operator scope per Sprint X+1.2.
 * Customers no longer self-configure strategies; only leverage override
 * remains customer-controllable via /api/crypto/leverage.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'gone',
      message:
        'Self-configure strategy sudah tidak didukung — strategy diatur oleh operator. Override leverage di /portal/crypto/leverage.',
    },
    { status: 410 },
  );
}
