import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

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

const SUBSCRIBER_TIERS = ['SIGNAL_BASIC', 'SIGNAL_VIP', 'PAMM_BASIC', 'PAMM_PRO'];

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const brief = await prisma.pairBrief.findUnique({
    where: { slug: params.slug, isPublished: true },
  });

  if (!brief) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const tier = await getUserTier(request);
  const isSubscriber = tier != null && SUBSCRIBER_TIERS.includes(tier);

  if (!isSubscriber) {
    // Return preview only
    return NextResponse.json({
      brief: {
        id: brief.id,
        pair: brief.pair,
        session: brief.session,
        date: brief.date,
        slug: brief.slug,
        supportLevels: brief.supportLevels,
        resistanceLevels: brief.resistanceLevels,
        fundamentalBias: brief.fundamentalBias,
        confluenceScore: brief.confluenceScore,
        isPublished: brief.isPublished,
        publishedAt: brief.publishedAt,
      },
      access: 'preview',
      tier: tier ?? 'anonymous',
    });
  }

  // Full access for subscribers
  return NextResponse.json({
    brief: {
      id: brief.id,
      pair: brief.pair,
      session: brief.session,
      date: brief.date,
      slug: brief.slug,
      supportLevels: brief.supportLevels,
      resistanceLevels: brief.resistanceLevels,
      fundamentalBias: brief.fundamentalBias,
      confluenceScore: brief.confluenceScore,
      sndZones: brief.sndZones,
      keyPatterns: brief.keyPatterns,
      fakeLiquidity: brief.fakeLiquidity,
      narrative: brief.narrative,
      narrative_en: brief.narrative_en,
      tradeIdeas: brief.tradeIdeas,
      validationStatus: brief.validationStatus,
      isPublished: brief.isPublished,
      publishedAt: brief.publishedAt,
    },
    access: 'full',
    tier,
  });
}
