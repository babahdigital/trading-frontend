/**
 * Fonnte WhatsApp test endpoint — admin-gated smoke test.
 *
 * Send pesan WhatsApp test via Fonnte API ke nomor target untuk verify:
 * - FONNTE_TOKEN env loaded correctly di container
 * - Fonnte API reachable + responding OK
 * - Phone number format (+62...) valid + delivered
 *
 * Pakai: POST /api/admin/fonnte-test dengan ADMIN_TOKEN bearer auth.
 * Body: { target: "+628123456789", message?: "Custom test message" }
 *
 * Endpoint disabled (404) kalau ADMIN_TOKEN env tidak di-set.
 */
import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/fonnte-test');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json({ error: 'Admin test disabled (ADMIN_TOKEN unset)' }, { status: 404 });
  }

  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (provided !== adminToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const fonnteToken = process.env.FONNTE_TOKEN;
  if (!fonnteToken) {
    return NextResponse.json({
      ok: false,
      error: 'FONNTE_TOKEN not configured in container env',
      hint: 'Set FONNTE_TOKEN=... di /opt/trading-commercial/.env lalu docker compose restart',
    }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const target: string = body.target || '';
  const message: string = body.message || `[BabahAlgo SMOKE TEST] Fonnte WhatsApp integration verified at ${new Date().toISOString()}`;

  if (!target || !/^\+?\d{8,15}$/.test(target.replace(/[\s-]/g, ''))) {
    return NextResponse.json({
      ok: false,
      error: 'Invalid target — pakai format E.164 (+628123456789)',
    }, { status: 400 });
  }

  try {
    const normalized = target.startsWith('+') ? target.slice(1) : target;
    log.info(`Sending Fonnte test to ${normalized}...`);

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: fonnteToken },
      body: new URLSearchParams({
        target: normalized,
        message,
        countryCode: '62',
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text);
    } catch {
      // Fonnte sometimes return non-JSON
    }

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: `Fonnte API returned ${res.status}`,
        fonnteResponse: data || text,
      }, { status: 502 });
    }

    if (data.status === false) {
      return NextResponse.json({
        ok: false,
        error: 'Fonnte rejected the send',
        fonnteResponse: data,
        hint: 'Cek nomor device WhatsApp di Fonnte dashboard masih connected',
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      message: 'WhatsApp test sent — cek inbox target untuk verify delivery',
      target: normalized,
      fonnteResponse: data,
      tokenPreview: `${fonnteToken.slice(0, 4)}...${fonnteToken.slice(-4)}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log.error('Fonnte test threw', err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * GET — check FONNTE_TOKEN configuration tanpa send pesan.
 * Pakai untuk pre-flight check sebelum POST send test.
 */
export async function GET(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json({ error: 'Admin test disabled (ADMIN_TOKEN unset)' }, { status: 404 });
  }

  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (provided !== adminToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const fonnteToken = process.env.FONNTE_TOKEN;
  return NextResponse.json({
    ok: true,
    fonnteConfigured: !!fonnteToken,
    tokenPreview: fonnteToken ? `${fonnteToken.slice(0, 4)}...${fonnteToken.slice(-4)}` : null,
    sendEndpoint: 'POST /api/admin/fonnte-test { target: "+62...", message?: "..." }',
  });
}
