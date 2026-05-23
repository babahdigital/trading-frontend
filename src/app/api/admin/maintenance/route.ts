import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt, isAdminRole } from '@/lib/auth/jwt';
import { getMaintenanceState, setMaintenanceState } from '@/lib/maintenance';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/notifier/email';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/maintenance');

/**
 * GET /api/admin/maintenance
 * Public-readable — returns current maintenance state.
 * Used by Edge middleware (internal fetch) and admin UI.
 * Listed in publicPaths so the middleware does not require JWT for GET.
 */
export async function GET() {
  try {
    const state = await getMaintenanceState();
    return NextResponse.json(state);
  } catch {
    // Fail-open: if DB is down, report maintenance as disabled
    return NextResponse.json({ enabled: false });
  }
}

/**
 * PATCH /api/admin/maintenance
 * Admin-only — toggle maintenance mode on/off with optional message and ETA.
 *
 * This route is in publicPaths (so Edge middleware skips JWT) but PATCH
 * self-authenticates via cookie/header JWT. Defense-in-depth: requireAdmin
 * header check alone is insufficient when middleware doesn't set x-user-role.
 *
 * Body: { enabled: boolean, message?: string, estimatedEnd?: string }
 */
export async function PATCH(request: NextRequest) {
  // Self-authenticate: read JWT from cookie or Authorization header
  const authHeader = request.headers.get('authorization');
  const cookieStore = await cookies();
  const token =
    authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : cookieStore.get('access_token')?.value;

  if (!token) {
    return NextResponse.json(
      { code: 'unauthorized', error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const payload = await verifyJwt(token);
  if (!payload || !isAdminRole(payload.role)) {
    return NextResponse.json(
      { code: 'forbidden', error: 'Forbidden — admin access required' },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        { code: 'invalid_input', error: '"enabled" must be a boolean' },
        { status: 400 },
      );
    }

    const prevState = await getMaintenanceState();
    const state = await setMaintenanceState({
      enabled: body.enabled,
      message: typeof body.message === 'string' ? body.message : undefined,
      estimatedEnd: typeof body.estimatedEnd === 'string' ? body.estimatedEnd : undefined,
    });

    // Send email to all clients when maintenance is turned ON (not on OFF or unchanged)
    if (state.enabled && !prevState.enabled) {
      notifyClientsAsync(state).catch((err) =>
        log.warn(`Maintenance email blast failed: ${err}`),
      );
    }

    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { code: 'internal_error', error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

interface MaintenanceEmailState {
  enabled: boolean;
  message?: string;
  estimatedEnd?: string;
}

async function notifyClientsAsync(state: MaintenanceEmailState): Promise<void> {
  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT', isActive: true },
    select: { email: true, name: true, locale: true },
  });

  if (clients.length === 0) return;

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com';
  let sent = 0;

  for (const client of clients) {
    const isEn = client.locale === 'en';
    const etaLine = state.estimatedEnd
      ? (isEn
          ? `<p style="margin:16px 0;font-size:14px;color:#f59e0b;"><strong>Estimated completion:</strong> ${state.estimatedEnd}</p>`
          : `<p style="margin:16px 0;font-size:14px;color:#f59e0b;"><strong>Estimasi selesai:</strong> ${state.estimatedEnd}</p>`)
      : '';

    const subject = isEn
      ? 'BabahAlgo — Scheduled Maintenance'
      : 'BabahAlgo — Pemeliharaan Terjadwal';

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0B1220;color:#e2e8f0;border-radius:8px;">
        <img src="${siteUrl}/logo/babahalgo-icon-256.png" alt="BabahAlgo" width="40" height="40" style="margin-bottom:16px;" />
        <h2 style="color:#f59e0b;margin:0 0 12px;">${isEn ? 'Scheduled Maintenance' : 'Pemeliharaan Terjadwal'}</h2>
        <p style="font-size:15px;line-height:1.6;color:#cbd5e1;">
          ${state.message || (isEn
            ? 'Our team is performing scheduled maintenance to improve platform performance and security. All services will be available again shortly.'
            : 'Tim kami sedang melakukan pemeliharaan terjadwal untuk meningkatkan performa dan keamanan platform. Seluruh layanan akan segera kembali tersedia.')}
        </p>
        ${etaLine}
        <p style="font-size:13px;color:#64748b;margin-top:24px;">
          ${isEn
            ? 'We apologize for the inconvenience. No action is required from your side.'
            : 'Mohon maaf atas ketidaknyamanannya. Tidak ada tindakan yang perlu Anda lakukan.'}
        </p>
        <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;" />
        <p style="font-size:11px;color:#475569;">
          BabahAlgo &mdash; <a href="${siteUrl}" style="color:#f59e0b;">${siteUrl}</a>
        </p>
      </div>
    `;

    try {
      await sendEmail(client.email, subject, html);
      sent++;
    } catch (err) {
      log.warn(`Maintenance email to ${client.email} failed: ${err}`);
    }
  }

  log.info(`Maintenance email sent to ${sent}/${clients.length} clients`);
}
