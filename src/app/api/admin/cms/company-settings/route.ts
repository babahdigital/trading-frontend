/**
 * Admin company settings API.
 *
 * GET: return all company.* SiteSettings (defaults applied).
 * PUT: bulk upsert dari payload object. Empty string allowed (artinya
 *      "kosongkan field"), undefined dilewati (preserve existing).
 *
 * Cache invalidate dipanggil setelah PUT supaya admin lihat perubahan
 * langsung di public footer.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  getCompanySettings,
  invalidateCompanyCache,
  fieldToSettingKey,
  type CompanySettings,
} from '@/lib/company/settings';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const settings = await getCompanySettings({ skipCache: true });
  return NextResponse.json({ settings });
}

const putSchema = z.object({
  name: z.string().max(120).optional(),
  legalEntity: z.string().max(120).optional(),
  tagline: z.string().max(200).optional(),
  taglineEn: z.string().max(200).optional(),
  logoUrl: z.string().max(500).optional(),
  logoDarkUrl: z.string().max(500).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(40).optional(),
  whatsappDigits: z.string().regex(/^[0-9]*$/, 'digits_only').max(20).optional().or(z.literal('')),
  emailGeneral: z.string().email().or(z.literal('')).optional(),
  emailCompliance: z.string().email().or(z.literal('')).optional(),
  emailSupport: z.string().email().or(z.literal('')).optional(),
  country: z.string().max(2).optional(),
  foundedYear: z.string().max(4).optional(),
  twitterUrl: z.string().url().or(z.literal('')).optional(),
  linkedinUrl: z.string().url().or(z.literal('')).optional(),
  telegramUrl: z.string().url().or(z.literal('')).optional(),
  instagramUrl: z.string().url().or(z.literal('')).optional(),
  refundPolicyDays: z.number().int().min(0).max(90).optional(),
});

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updates: { key: string; value: string }[] = [];
  for (const [field, value] of Object.entries(parsed.data) as [keyof CompanySettings, string | number | undefined][]) {
    if (value === undefined) continue;
    updates.push({ key: fieldToSettingKey(field), value: String(value) });
  }

  for (const u of updates) {
    await prisma.siteSetting.upsert({
      where: { key: u.key },
      update: { value: u.value, type: 'string' },
      create: { key: u.key, value: u.value, type: 'string' },
    });
  }

  invalidateCompanyCache();
  return NextResponse.json({ success: true, updated: updates.length });
}
