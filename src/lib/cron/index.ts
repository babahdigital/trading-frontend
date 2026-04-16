import { runKillSwitchCron } from './kill-switch';
import { runHealthCheckCron } from './health-check';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron');

let cronInitialized = false;

export function initCronJobs() {
  if (cronInitialized) return;
  cronInitialized = true;

  log.info('Initializing cron jobs...');

  setInterval(async () => {
    try {
      await runKillSwitchCron();
    } catch (err) {
      log.error('Kill-switch error:', err);
    }
  }, 60 * 1000);

  setInterval(async () => {
    try {
      await runHealthCheckCron();
    } catch (err) {
      log.error('Health-check error:', err);
    }
  }, 5 * 60 * 1000);

  setTimeout(() => runHealthCheckCron().catch((err) => log.error('Health-check startup error:', err)), 5000);

  log.info('Cron jobs initialized: kill-switch (60s), health-check (5m)');
}
