/**
 * Public Xendit config — return publishable key untuk client tokenization.
 *
 * Xendit.js (loaded via <script src="https://js.xendit.co/v1/xendit.min.js">)
 * butuh public key di-set via window.Xendit.setPublishableKey(key).
 *
 * Endpoint ini cuma echo public key dari env — TIDAK ada secret data.
 * Memungkinkan key rotation tanpa rebuild (dibanding NEXT_PUBLIC_ env
 * yang baked di build time).
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
  const publicKey = process.env.XENDIT_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ code: 'not_configured', error: 'Xendit public key not configured' }, { status: 500 });
  }
  // Detect dev vs prod by key prefix supaya FE bisa show banner
  const isDev = publicKey.startsWith('xnd_public_development_');
  // Global Account flag — controls visibility of regional e-wallets
  // (PH/MY/SG). Default false untuk Indonesian merchant tanpa Global Account.
  const globalAccountEnabled = process.env.XENDIT_GLOBAL_ACCOUNT_ENABLED === 'true';
  return NextResponse.json({ publicKey, isDev, globalAccountEnabled });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
