export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';

const ASSET_CLASSES = ['FOREX', 'CRYPTO', 'MULTI'] as const;
const CATEGORIES = [
  'RESEARCH',
  'STRATEGY',
  'EXECUTION',
  'RISK',
  'OPERATIONS',
  'MARKET_ANALYSIS',
  'EDUCATION',
  'CASE_STUDY',
  'COMPLIANCE',
] as const;

const createSchema = z.object({
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  titleId: z.string().min(5),
  titleEn: z.string().min(5),
  excerptId: z.string().min(20),
  excerptEn: z.string().min(20),
  promptTemplate: z.string().min(50),
  dataSources: z.array(z.record(z.string(), z.unknown())).default([]),
  keywords: z.array(z.string()).default([]),
  category: z.enum(CATEGORIES).default('EDUCATION'),
  assetClass: z.enum(ASSET_CLASSES).default('FOREX'),
  targetLengthWords: z.number().int().min(300).max(5000).default(1500),
  scheduledWeek: z.number().int().min(1).max(52).default(1),
  priority: z.number().int().min(0).max(1000).default(0),
  autoPublish: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const assetClass = request.nextUrl.searchParams.get('assetClass');
  const status = request.nextUrl.searchParams.get('status');

  const topics = await prisma.blogTopic.findMany({
    where: {
      ...(assetClass ? { assetClass: assetClass as 'FOREX' | 'CRYPTO' | 'MULTI' } : {}),
      ...(status ? { status: status as 'PENDING' | 'GENERATING' | 'GENERATED' | 'PUBLISHED' | 'FAILED' | 'DISABLED' } : {}),
    },
    orderBy: [{ priority: 'desc' }, { scheduledWeek: 'asc' }, { createdAt: 'desc' }],
    include: {
      article: {
        select: { id: true, slug: true, isPublished: true, publishedAt: true, readTime: true },
      },
    },
  });

  return NextResponse.json(topics);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.blogTopic.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json({ error: `Topic with slug "${parsed.data.slug}" already exists` }, { status: 409 });
  }

  const topic = await prisma.blogTopic.create({
    data: {
      ...parsed.data,
      dataSources: parsed.data.dataSources as unknown as object[],
      keywords: parsed.data.keywords,
    },
  });

  return NextResponse.json(topic, { status: 201 });
}
