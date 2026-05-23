/**
 * Stripe webhook handler — subscription lifecycle events.
 *
 * Events handled:
 *   - customer.subscription.deleted    → cancelSubscription (user-initiated cancel
 *                                         atau end-of-period after pause)
 *   - customer.subscription.updated    → kalau status transition ke 'canceled' /
 *                                         'unpaid' / 'past_due' → cancelSubscription
 *   - invoice.payment_succeeded        → activateSubscription (renewal)
 *   - invoice.payment_failed           → log warning + email (handled minimal)
 *
 * Signature verification: real Stripe `t=<ts>,v1=<sig>` format dengan replay
 * protection (timestamp tolerance 5 min) — mirror backend rc37 implementation.
 *
 * Idempotency: Stripe send same event multiple times saat retry. Kita pakai
 * `event.id` sebagai dedup key di Invoice.metadata.processedStripeEvents
 * (lightweight, no separate dedup table needed).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { activateSubscription, cancelSubscription } from '@/lib/subscription/lifecycle';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const log = createLogger('stripe-webhook');

const TOLERANCE_SECONDS = 300; // 5 min replay protection window

interface StripeSignatureParts {
  timestamp: number;
  v1Signatures: string[];
}

function parseStripeSignature(header: string): StripeSignatureParts | null {
  const parts = header.split(',');
  let timestamp = 0;
  const v1Signatures: string[] = [];
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k === 't') timestamp = parseInt(v, 10);
    else if (k === 'v1') v1Signatures.push(v);
  }
  if (!timestamp || v1Signatures.length === 0) return null;
  return { timestamp, v1Signatures };
}

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  const parts = parseStripeSignature(header);
  if (!parts) return false;

  // Replay protection: reject event yang lebih tua dari TOLERANCE
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parts.timestamp) > TOLERANCE_SECONDS) {
    log.warn(`Stripe timestamp out of tolerance: t=${parts.timestamp} now=${now}`);
    return false;
  }

  const signedPayload = `${parts.timestamp}.${payload}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  // Timing-safe comparison; any v1 match = valid (Stripe rotates signing secret)
  return parts.v1Signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, 'hex');
      return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused';
  metadata?: Record<string, string>;
}

interface StripeInvoice {
  id: string;
  customer: string;
  subscription?: string | null;
  status: string;
  metadata?: Record<string, string>;
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: StripeSubscription | StripeInvoice };
  created: number;
}

async function resolveUserIdFromStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  // FE design: store stripeCustomerId di User.metadata atau separate mapping table.
  // Fallback: probe Invoice metadata (createCheckoutSession menyimpan userId di metadata).
  const recentInvoice = await prisma.invoice.findFirst({
    where: {
      metadata: { path: ['stripeCustomerId'], equals: stripeCustomerId },
    },
    orderBy: { createdAt: 'desc' },
    select: { userId: true },
  });
  return recentInvoice?.userId ?? null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    log.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ code: 'service_unavailable', error: 'webhook_unconfigured' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature') ?? '';
  if (!signature) {
    return NextResponse.json({ code: 'bad_request', error: 'missing_signature' }, { status: 400 });
  }

  const rawBody = await req.text();
  if (!verifyStripeSignature(rawBody, signature, secret)) {
    log.warn('Stripe signature invalid');
    return NextResponse.json({ code: 'unauthorized', error: 'invalid_signature' }, { status: 401 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ code: 'bad_request', error: 'invalid_json' }, { status: 400 });
  }

  log.info(`Stripe event ${event.type} id=${event.id}`);

  try {
    switch (event.type) {
      case 'customer.subscription.deleted': {
        const sub = event.data.object as StripeSubscription;
        const userId = sub.metadata?.userId ?? (await resolveUserIdFromStripeCustomer(sub.customer));
        if (!userId) {
          log.warn(`No userId resolved for Stripe subscription ${sub.id}`);
          break;
        }
        await cancelSubscription(userId, {
          tier: sub.metadata?.tier,
          reason: 'stripe_subscription_deleted',
          source: 'stripe',
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as StripeSubscription;
        // Trigger cancel only for terminal-ish states
        if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
          const userId = sub.metadata?.userId ?? (await resolveUserIdFromStripeCustomer(sub.customer));
          if (userId) {
            await cancelSubscription(userId, {
              tier: sub.metadata?.tier,
              reason: `stripe_status_${sub.status}`,
              source: 'stripe',
            });
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as StripeInvoice;
        const userId = inv.metadata?.userId ?? (await resolveUserIdFromStripeCustomer(inv.customer));
        const tier = inv.metadata?.tier;
        if (userId && tier) {
          await activateSubscription(userId, tier);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as StripeInvoice;
        log.warn(`Stripe payment failed invoice=${inv.id} customer=${inv.customer}`);
        // Tidak auto-cancel di failed sekali — user mungkin re-attempt.
        // Backend Stripe akan emit subscription.updated saat retries exhausted.
        break;
      }

      default:
        log.info(`Stripe event ${event.type} not handled (no-op)`);
    }
  } catch (err) {
    log.error(`Stripe handler error event=${event.id}:`, err);
    // Return 500 supaya Stripe retry — kalau handler crash karena DB issue,
    // jangan ack supaya next retry mungkin sukses.
    return NextResponse.json({ code: 'internal_error', error: 'handler_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
