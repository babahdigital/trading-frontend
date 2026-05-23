import { NextRequest, NextResponse } from 'next/server';
import { runDailyResearch } from '@/lib/workers/daily-research';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorized(req: NextRequest): boolean {
  const header = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  return !!expected && header === expected;
}

export async function GET(req: NextRequest) {
  try {
  if (!authorized(req)) {
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
  }
  const result = await runDailyResearch();
  return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export const POST = GET;
