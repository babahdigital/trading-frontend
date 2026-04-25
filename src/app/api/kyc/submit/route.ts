export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

const SubmitBody = z.object({
  fullName: z.string().min(3).max(120),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nationality: z.string().min(2).max(3).default('ID'),
  occupation: z.string().min(3).max(120),
  sourceOfFunds: z.string().min(10).max(500),

  addressLine1: z.string().min(5).max(160),
  addressLine2: z.string().max(160).optional().or(z.literal('')),
  city: z.string().min(2).max(80),
  province: z.string().min(2).max(80),
  postalCode: z.string().min(4).max(12),
  country: z.string().min(2).max(3).default('ID'),

  documentType: z.enum(['KTP', 'PASSPORT', 'SIM', 'NPWP']),
  documentNumber: z.string().min(5).max(40),

  investmentExperience: z.enum(['novice', 'intermediate', 'advanced', 'professional']),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
  expectedMonthlyVolume: z.enum(['lt_10k', '10k_50k', '50k_250k', 'gt_250k']),
});

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof SubmitBody>;
  try {
    body = SubmitBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  const dob = new Date(body.dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return NextResponse.json({ error: 'invalid_dob' }, { status: 400 });
  }
  // Min age check — 18 years
  const ageMs = Date.now() - dob.getTime();
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears < 18) {
    return NextResponse.json({ error: 'age_below_minimum', message: 'Usia minimum 18 tahun.' }, { status: 400 });
  }

  const existing = await prisma.userKyc.findUnique({ where: { userId } });
  if (existing && existing.status === 'APPROVED') {
    return NextResponse.json({ error: 'already_approved' }, { status: 409 });
  }
  if (existing && existing.status === 'PENDING_REVIEW') {
    return NextResponse.json({ error: 'review_in_progress', message: 'KYC sedang ditinjau, mohon tunggu.' }, { status: 409 });
  }

  const data = {
    userId,
    status: 'PENDING_REVIEW' as const,
    fullName: body.fullName,
    dateOfBirth: dob,
    nationality: body.nationality,
    occupation: body.occupation,
    sourceOfFunds: body.sourceOfFunds,
    addressLine1: body.addressLine1,
    addressLine2: body.addressLine2 || null,
    city: body.city,
    province: body.province,
    postalCode: body.postalCode,
    country: body.country,
    documentType: body.documentType,
    documentNumber: body.documentNumber,
    investmentExperience: body.investmentExperience,
    riskTolerance: body.riskTolerance,
    expectedMonthlyVolume: body.expectedMonthlyVolume,
    submittedAt: new Date(),
    reviewedAt: null,
    rejectionReason: null,
  };

  const kyc = existing
    ? await prisma.userKyc.update({ where: { userId }, data })
    : await prisma.userKyc.create({ data });

  return NextResponse.json({ ok: true, status: kyc.status, submittedAt: kyc.submittedAt });
}
