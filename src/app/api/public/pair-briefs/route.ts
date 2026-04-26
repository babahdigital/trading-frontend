import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Preview fields visible to everyone (unauthenticated)
const PREVIEW_SELECT = {
  id: true,
  pair: true,
  session: true,
  date: true,
  slug: true,
  supportLevels: true,
  resistanceLevels: true,
  fundamentalBias: true,
  confluenceScore: true,
  isPublished: true,
  publishedAt: true,
} as const;

// Full fields for SIGNAL_BASIC+ subscribers
const FULL_SELECT = {
  ...PREVIEW_SELECT,
  sndZones: true,
  keyPatterns: true,
  fakeLiquidity: true,
  narrative: true,
  narrative_en: true,
  tradeIdeas: true,
  validationStatus: true,
} as const;

/**
 * Try to extract user subscription tier from JWT.
 * Returns null if unauthenticated or no active subscription.
 */
async function getUserTier(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.cookies.get('access_token')?.value;

  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;
    if (!userId) return null;

    const activeSub = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { tier: true },
    });

    return activeSub?.tier ?? null;
  } catch {
    return null;
  }
}

// All Signal subscribers get pair-brief access (canonical + legacy).
// PAMM removed per audit 2026-04-26 (zero-custody, deprecated tier).
const SUBSCRIBER_TIERS = ['SIGNAL_STARTER', 'SIGNAL_BASIC', 'SIGNAL_PRO', 'SIGNAL_VIP'];

export async function GET(request: NextRequest) {
  const pair = request.nextUrl.searchParams.get('pair');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '20'), 50);

  const tier = await getUserTier(request);
  const isSubscriber = tier != null && SUBSCRIBER_TIERS.includes(tier);

  const where = {
    isPublished: true,
    ...(pair ? { pair: pair.toUpperCase() } : {}),
  };

  const briefs = await prisma.pairBrief.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: isSubscriber ? FULL_SELECT : PREVIEW_SELECT,
  });

  return NextResponse.json({
    briefs,
    access: isSubscriber ? 'full' : 'preview',
    tier: tier ?? 'anonymous',
  });
}
