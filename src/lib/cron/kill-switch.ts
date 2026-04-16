import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import { proxyToVpsBackend } from '@/lib/proxy/vps-client';

// Kill-switch cron: scan expired licenses, stop backends, update status
export async function runKillSwitchCron() {
  const now = new Date();
  console.log(`[kill-switch] Running at ${now.toISOString()}`);

  // Find active licenses that have expired
  const expiredLicenses = await prisma.license.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: now },
    },
    include: {
      user: true,
      vpsInstance: true,
    },
  });

  console.log(`[kill-switch] Found ${expiredLicenses.length} expired licenses`);

  for (const license of expiredLicenses) {
    try {
      let success = true;
      let apiResponse: Record<string, unknown> = {};

      // VPS_INSTALLATION: call POST /api/scalping/stop on VPS backend
      if (license.type === 'VPS_INSTALLATION' && license.vpsInstanceId) {
        try {
          const resp = await proxyToVpsBackend(
            license.vpsInstanceId,
            '/api/scalping/stop',
            { method: 'POST' }
          );
          apiResponse = await resp.json() as Record<string, unknown>;
          success = resp.ok;
        } catch (err) {
          success = false;
          apiResponse = { error: String(err) };
        }
      }

      // PAMM/Signal: revoke all active sessions for user
      if (license.type === 'PAMM_SUBSCRIBER' || license.type === 'SIGNAL_SUBSCRIBER') {
        await prisma.session.updateMany({
          where: { userId: license.userId, revokedAt: null },
          data: { revokedAt: now },
        });
      }

      // Update license status
      await prisma.license.update({
        where: { id: license.id },
        data: { status: 'EXPIRED' },
      });

      // Also expire related subscriptions
      await prisma.subscription.updateMany({
        where: { userId: license.userId, status: 'ACTIVE', expiresAt: { lte: now } },
        data: { status: 'EXPIRED' },
      });

      // Create kill switch event
      await prisma.killSwitchEvent.create({
        data: {
          licenseId: license.id,
          triggeredBy: 'cron_expiry',
          apiResponse: apiResponse as Prisma.InputJsonValue,
          success,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: license.userId,
          licenseId: license.id,
          action: 'kill_switch_auto',
          metadata: {
            reason: 'license_expired',
            type: license.type,
            success,
          },
        },
      });

      console.log(
        `[kill-switch] License ${license.licenseKey} expired → ${success ? 'stopped' : 'FAILED'}`
      );
    } catch (err) {
      console.error(`[kill-switch] Error processing license ${license.id}:`, err);
    }
  }

  console.log(`[kill-switch] Done. Processed ${expiredLicenses.length} licenses.`);
}
