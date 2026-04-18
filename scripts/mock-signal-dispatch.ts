/**
 * Mock signal dispatch test.
 * Run: npx tsx scripts/mock-signal-dispatch.ts
 *
 * Tests the full pipeline: signal → dispatcher → Telegram + Email.
 * Requires: TELEGRAM_BOT_TOKEN, SMTP_* credentials, active test subscription.
 */

// Resolve path aliases
import { register } from 'tsconfig-paths';
import { resolve } from 'path';

// Load .env
import { config } from 'dotenv';
config({ path: resolve(__dirname, '..', '.env') });

async function main() {
  // Dynamic import after env is loaded
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Check active subscribers
    const subs = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', tier: { in: ['SIGNAL_BASIC', 'SIGNAL_VIP'] } },
      include: { user: { select: { email: true, name: true, telegramChatId: true } } },
    });

    console.log(`Found ${subs.length} active signal subscribers:`);
    for (const s of subs) {
      console.log(`  - ${s.user.email} (${s.tier}) telegram=${s.user.telegramChatId || 'none'}`);
    }

    if (subs.length === 0) {
      console.log('\nNo active subscribers. Run seed first:');
      console.log('  npx tsx prisma/seed-test-subscriber.ts');
      return;
    }

    const mockSignal = {
      id: 999999,
      emitted_at: new Date().toISOString(),
      pair: 'BTCUSD',
      direction: 'SELL' as const,
      entry_type: 'smc',
      confidence: 0.85,
      market_condition: 'trending_down',
      entry_price_hint: 76000.0,
      take_profit: 75500.0,
      stop_loss: 76300.0,
      reasoning: 'Mock signal untuk pre-flight test. H4 distribution phase, H1 BOS bearish, M15 bias bearish. Smart money concept entry setelah liquidity sweep.',
      indicator_snapshot_summary: {
        h4_phase: 'distribution',
        h1_event: 'bos_bear',
        m15_bias: 'bearish',
      },
    };

    console.log('\nDispatching mock signal:', JSON.stringify(mockSignal, null, 2));

    // Import dispatcher dynamically
    const { dispatchSignalToSubscribers } = await import('../src/lib/notifier/dispatcher');
    const result = await dispatchSignalToSubscribers(mockSignal);

    console.log('\nDispatch result:');
    console.log(`  Sent: ${result.sent}`);
    console.log(`  Failed: ${result.failed}`);
    console.log(`  Skipped: ${result.skipped}`);

    // Check notification logs
    const logs = await prisma.notificationLog.findMany({
      where: { refId: '999999' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`\nNotification logs (${logs.length}):`);
    for (const l of logs) {
      console.log(`  ${l.channel} → ${l.status} ${l.errorMessage || ''}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
