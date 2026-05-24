import { NextRequest } from 'next/server';

export function verifyCronSecret(req: NextRequest): boolean {
  const header = req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;
  return !!expected && !!header && header === expected;
}
