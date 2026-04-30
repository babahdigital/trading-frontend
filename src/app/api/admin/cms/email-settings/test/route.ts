/**
 * Admin email test send.
 *
 * POST { to: "abdullah@example.com" }
 * → kirim email test pakai config saat ini. Berguna setelah admin update
 *   API key untuk verify Brevo masih responsive.
 *
 * Return Brevo messageId untuk traceability.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { sendEmail } from '@/lib/notifier/email';
import { z } from 'zod';

const testSchema = z.object({
  to: z.string().email(),
});

function buildTestHtml(to: string): string {
  const ts = new Date().toISOString();
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
  <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px; background: #fafafa;">
    <h1 style="font-size: 22px; margin: 0 0 16px; color: #f59e0b;">BabahAlgo · Email Test</h1>
    <p style="font-size: 15px; line-height: 1.6;">Halo,</p>
    <p style="font-size: 15px; line-height: 1.6;">
      Email ini dikirim sebagai <strong>uji coba</strong> dari admin console BabahAlgo
      untuk memverifikasi konfigurasi Brevo sudah benar.
    </p>
    <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 6px 0; color: #666; width: 120px;">Penerima</td><td style="padding: 6px 0;"><code>${to}</code></td></tr>
      <tr><td style="padding: 6px 0; color: #666;">Provider</td><td style="padding: 6px 0;">Brevo Transactional API</td></tr>
      <tr><td style="padding: 6px 0; color: #666;">Timestamp</td><td style="padding: 6px 0;"><code>${ts}</code></td></tr>
    </table>
    <p style="font-size: 13px; line-height: 1.5; color: #666; margin-top: 24px;">
      Jika Anda menerima email ini, konfigurasi sender + API key + DNS (SPF/DKIM)
      sudah aktif dengan benar. Anda boleh menutup email ini.
    </p>
  </div>
  <p style="font-size: 11px; color: #999; text-align: center; margin-top: 16px;">
    BabahAlgo · CV Babah Digital · Trading kuantitatif institusional
  </p>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await sendEmail(parsed.data.to, {
      subject: 'BabahAlgo · Email Test',
      html: buildTestHtml(parsed.data.to),
      text: `BabahAlgo Email Test\n\nDikirim ke: ${parsed.data.to}\nTimestamp: ${new Date().toISOString()}\n\nKonfigurasi Brevo verified.`,
      skipUnsubHeader: true, // ini transactional, bukan marketing
    });
    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json({ error: 'send_failed', message: msg }, { status: 502 });
  }
}
