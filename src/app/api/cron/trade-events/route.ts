import { NextRequest, NextResponse } from 'next/server';
import { runTradeEventsConsumer } from '@/lib/consumers/trade-events';
import { verifyCronSecret } from '@/lib/auth/cron';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
  }
  const result = await runTradeEventsConsumer();
  return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export const POST = GET;
