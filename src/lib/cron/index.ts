import { runKillSwitchCron } from './kill-switch';
import { runHealthCheckCron } from './health-check';
import { runSignalConsumer } from '@/lib/consumers/signal';
import { runTradeEventsConsumer } from '@/lib/consumers/trade-events';
import { runResearchIngester } from '@/lib/ingesters/research';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron');

let cronInitialized = false;

function bool(envKey: string, defaultVal = false): boolean {
  const v = process.env[envKey];
  if (v === undefined) return defaultVal;
  return v === '1' || v.toLowerCase() === 'true';
}

export function initCronJobs() {
  if (cronInitialized) return;
  cronInitialized = true;

  log.info('Initializing cron jobs...');

  // Kill switch — every 60s
  setInterval(async () => {
    try { await runKillSwitchCron(); } catch (err) { log.error('Kill-switch error:', err); }
  }, 60 * 1000);

  // Health check — every 5 min
  setInterval(async () => {
    try { await runHealthCheckCron(); } catch (err) { log.error('Health-check error:', err); }
  }, 5 * 60 * 1000);
  setTimeout(() => runHealthCheckCron().catch((err) => log.error('Health-check startup error:', err)), 5000);

  // Signal consumer — every 30s (feature-flagged)
  if (bool('ENABLE_SIGNAL_CONSUMER', false)) {
    setInterval(async () => {
      try { await runSignalConsumer(); } catch (err) { log.error('Signal consumer error:', err); }
    }, 30 * 1000);
    log.info('Signal consumer enabled (30s interval)');
  }

  // Trade events consumer — every 20s (feature-flagged)
  if (bool('ENABLE_TRADE_EVENTS_CONSUMER', false)) {
    setInterval(async () => {
      try { await runTradeEventsConsumer(); } catch (err) { log.error('Trade events consumer error:', err); }
    }, 20 * 1000);
    log.info('Trade events consumer enabled (20s interval)');
  }

  // Research ingester — every 6 hours (feature-flagged)
  if (bool('ENABLE_RESEARCH_INGESTER', false)) {
    setInterval(async () => {
      try { await runResearchIngester(); } catch (err) { log.error('Research ingester error:', err); }
    }, 6 * 60 * 60 * 1000);
    log.info('Research ingester enabled (6h interval)');
  }

  log.info('Cron jobs initialized.');
}
