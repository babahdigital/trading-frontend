export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

/**
 * DEPRECATED — strategy enrollment moved to operator scope per Sprint X+1.2.
 * Customers no longer self-configure strategies; only leverage override
 * remains customer-controllable via /api/crypto/leverage.
 */
export async function POST() {
  try {
  return NextResponse.json(
    {
      error: 'gone',
      message:
        'Self-configure strategy sudah tidak didukung — strategy diatur oleh operator. Override leverage di /portal/crypto/leverage.',
    },
    { status: 410 },
  );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
