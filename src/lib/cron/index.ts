import { runKillSwitchCron } from './kill-switch';
import { runHealthCheckCron } from './health-check';

let cronInitialized = false;

export function initCronJobs() {
  if (cronInitialized) return;
  cronInitialized = true;

  console.log('[cron] Initializing cron jobs...');

  // Kill-switch: run every minute, check for expired licenses
  // In production with node-cron: cron.schedule('1 0 * * *', ...) for 00:01 WITA
  // For now, run every 60 seconds for testing
  setInterval(async () => {
    try {
      await runKillSwitchCron();
    } catch (err) {
      console.error('[cron] Kill-switch error:', err);
    }
  }, 60 * 1000);

  // Health check: every 5 minutes
  setInterval(async () => {
    try {
      await runHealthCheckCron();
    } catch (err) {
      console.error('[cron] Health-check error:', err);
    }
  }, 5 * 60 * 1000);

  // Run health check immediately on startup
  setTimeout(() => runHealthCheckCron().catch(console.error), 5000);

  console.log('[cron] Cron jobs initialized: kill-switch (60s), health-check (5m)');
}
