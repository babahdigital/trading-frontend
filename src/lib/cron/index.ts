import { runKillSwitchCron } from './kill-switch';
import { runHealthCheckCron } from './health-check';
import { runSignalConsumer } from '@/lib/consumers/signal';
import { runTradeEventsConsumer } from '@/lib/consumers/trade-events';
import { runResearchIngester } from '@/lib/ingesters/research';
import { runPairBriefWorker } from '@/lib/workers/pair-brief';
import { runBlogArticleGenerator } from '@/lib/workers/blog-article-generator';
import { runDailyResearch } from '@/lib/workers/daily-research';
import { expireSubscriptions } from '@/lib/subscription/lifecycle';
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
    setTimeout(() => runResearchIngester().catch((err) => log.error('Research ingester startup error:', err)), 30_000);
    log.info('Research ingester enabled (6h interval, kickoff +30s)');
  }

  // Pair brief worker — every 4 hours (feature-flagged)
  if (bool('ENABLE_PAIR_BRIEF_WORKER', false)) {
    setInterval(async () => {
      try { await runPairBriefWorker(); } catch (err) { log.error('Pair brief worker error:', err); }
    }, 4 * 60 * 60 * 1000);
    setTimeout(() => runPairBriefWorker().catch((err) => log.error('Pair brief worker startup error:', err)), 45_000);
    log.info('Pair brief worker enabled (4h interval, kickoff +45s)');
  }

  // Blog article generator — every 12 hours, zero-touch.
  //
  // Auto-enabled by default when OPENROUTER_API_KEY is configured
  // (required for AI calls). Admin can force-disable with
  // ENABLE_BLOG_GENERATOR="0". Worker auto-seeds the BlogTopic catalog
  // on first run if the table is empty, so no admin curl is needed
  // post-deploy.
  const openRouterConfigured = !!process.env.OPENROUTER_API_KEY;
  const blogFlag = process.env.ENABLE_BLOG_GENERATOR;
  const blogGenEnabled = blogFlag === undefined
    ? openRouterConfigured
    : blogFlag === '1' || blogFlag.toLowerCase() === 'true';
  if (blogGenEnabled) {
    const intervalMs = parseInt(process.env.BLOG_GENERATOR_INTERVAL_MS || '', 10) || 12 * 60 * 60 * 1000;
    setInterval(async () => {
      try { await runBlogArticleGenerator(); } catch (err) { log.error('Blog generator error:', err); }
    }, intervalMs);
    setTimeout(() => runBlogArticleGenerator().catch((err) => log.error('Blog generator startup error:', err)), 60_000);
    log.info(`Blog article generator enabled (${Math.round(intervalMs / 3600000)}h interval, kickoff +60s, auto-seed on empty catalog)`);
  } else if (!openRouterConfigured) {
    log.info('Blog article generator idle — OPENROUTER_API_KEY not configured');
  }

  // Daily research auto-pipeline — once per 24h, day-of-week rotation
  // (Mon=recap, Tue=AI lesson, Wed=case study, Thu=correlation,
  // Fri=risk, Sat=strategy, Sun=preview). Auto-enabled when
  // OPENROUTER_API_KEY present; explicit ENABLE_DAILY_RESEARCH="0"
  // disables. Slug pattern `daily-{YYYY-MM-DD}-{type}` makes it
  // idempotent on same-day re-trigger.
  const dailyFlag = process.env.ENABLE_DAILY_RESEARCH;
  const dailyEnabled = dailyFlag === undefined
    ? openRouterConfigured
    : dailyFlag === '1' || dailyFlag.toLowerCase() === 'true';
  if (dailyEnabled) {
    setInterval(async () => {
      try { await runDailyResearch(); } catch (err) { log.error('Daily research error:', err); }
    }, 24 * 60 * 60 * 1000);
    setTimeout(() => runDailyResearch().catch((err) => log.error('Daily research startup error:', err)), 90_000);
    log.info('Daily research enabled (24h interval, kickoff +90s, day-of-week rotation)');
  }

  // Subscription expiry — every hour (expire + send renewal reminders)
  setInterval(async () => {
    try { await expireSubscriptions(); } catch (err) { log.error('Subscription expiry error:', err); }
  }, 60 * 60 * 1000);

  log.info('Cron jobs initialized.');
}