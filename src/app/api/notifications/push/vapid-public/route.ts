/**
 * Expose VAPID public key untuk browser pushManager.subscribe().
 *
 * Public key boleh leak; private key (VAPID_PRIVATE_KEY) STAYS server-side
 * untuk sign payload sebelum dispatch ke push provider endpoint.
 *
 * Generate keypair via `npx web-push generate-vapid-keys` saat PWA go-live.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json(
      {
        error: 'push_not_configured',
        message: 'VAPID keys belum di-provision. Push notifications disabled.',
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ publicKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
