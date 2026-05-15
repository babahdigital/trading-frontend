/**
 * Seed Changelog cron — populate /changelog page dengan milestone releases.
 *
 * Idempotent via unique `version` field — re-run aman, hanya insert kalau
 * version belum ada di DB. Update copy tetap manual via admin panel kalau
 * butuh adjust wording.
 *
 * Trigger: GET /api/cron/seed-changelog dengan CRON_SECRET bearer auth.
 * Auto-trigger di CI/CD post-deploy supaya production /changelog tidak kosong.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ChangelogCategory = 'FEATURE' | 'IMPROVEMENT' | 'FIX' | 'SECURITY' | 'BREAKING';

const SEED_ENTRIES: Array<{
  version: string;
  title: string;
  title_en: string;
  body: string;
  body_en: string;
  category: ChangelogCategory;
  releasedAt: string;
}> = [
  {
    version: '0.16.0',
    title: '3-Tier VPS License + Responsibility Matrix',
    title_en: '3-Tier VPS License + Responsibility Matrix',
    body: 'VPS License direstruktur jadi 3 tier dengan 3 model arsitektur:\n\n• License Only (Rp 5jt + Rp 1,5jt/bln) — Anda sediakan semua VPS, kami install software\n• Hybrid (Rp 12jt + Rp 3jt/bln) — Anda Windows MT5, kami Linux orchestrator\n• Full Turnkey (Rp 25jt + Rp 7,5jt/bln) — kami provision keduanya\n\nResponsibility matrix di /solutions/license menampilkan siapa provision apa per tier. Plus dual-VPS spec table (Windows MT5 + Linux Orchestrator) yang lebih akurat dari single-VPS spec sebelumnya.',
    body_en: 'VPS License restructured into 3 tiers mapping to 3 architecture models:\n\n• License Only ($320 + $95/mo) — you provide all VPS, we install software\n• Hybrid ($750 + $195/mo) — you provide Windows MT5, we provide Linux orchestrator\n• Full Turnkey ($1,600 + $475/mo) — we provision both\n\nResponsibility matrix on /solutions/license shows who provisions what per tier. Plus dual-VPS spec table (Windows MT5 + Linux Orchestrator) more accurate than the prior single-VPS spec.',
    category: 'FEATURE',
    releasedAt: '2026-05-15T10:00:00Z',
  },
  {
    version: '0.15.0',
    title: 'Decision Quiz + Solutions Ladder',
    title_en: 'Decision Quiz + Solutions Ladder',
    body: 'Halaman /solutions ditambah 2 fitur untuk membantu user pilih tier yang tepat:\n\n• Decision Ladder — 4-card grid (Robot Meta Retail / VPS License / Institutional / Robot Crypto) dengan modal range jelas di setiap card.\n• Decision Quiz — 3 pertanyaan interactive auto-routing ke product yang cocok berdasarkan asset class, modal, dan technical comfort.\n\nReciprocal comparison block ditambah di /solutions/institutional dan /solutions/license — bidirectional navigation supaya klien yang salah pintu bisa pindah ke product yang tepat.',
    body_en: 'The /solutions page now has 2 features to help users pick the right tier:\n\n• Decision Ladder — 4-card grid (Robot Meta Retail / VPS License / Institutional / Robot Crypto) with clear capital range per card.\n• Decision Quiz — 3-question interactive auto-routing to the right product based on asset class, capital, and technical comfort.\n\nReciprocal comparison block added to /solutions/institutional and /solutions/license — bidirectional navigation so misrouted clients can pivot to the right product.',
    category: 'FEATURE',
    releasedAt: '2026-05-15T08:00:00Z',
  },
  {
    version: '0.14.0',
    title: 'Institutional Pricing Recalibration',
    title_en: 'Institutional Pricing Recalibration',
    body: 'Pricing /solutions/institutional di-recalibrate berdasarkan riset B2B SaaS finance standard (license/AUM ratio 7-12%):\n\n• AUM minimum: Rp 4 miliar → Rp 3,2 miliar (USD 200K)\n• License: Rp 1,2-1,8 miliar/tahun → Rp 250-400 juta/tahun\n• Setup: Rp 200-400 juta → Rp 75-150 juta one-time\n• Support: Rp 25 juta/bln → Rp 12 juta/bln\n\nLayout 2-zona visual jelas separate "Biaya yang Anda bayar ke kami" vs "Modal trading Anda (BUKAN BIAYA)" supaya tidak salah paham. Copy "mandate bespoke" jargon → "trading yang disesuaikan kebutuhan klien" human-friendly.',
    body_en: 'Pricing on /solutions/institutional recalibrated based on B2B SaaS finance research (license/AUM ratio 7-12%):\n\n• AUM minimum: Rp 4 billion → Rp 3.2 billion (USD 200K)\n• License: Rp 1.2-1.8B/year → Rp 250-400M/year\n• Setup: Rp 200-400M → Rp 75-150M one-time\n• Support: Rp 25M/mo → Rp 12M/mo\n\nLayout has 2 visually distinct zones separating "What you pay us" vs "Your trading capital (NOT A FEE)" to prevent misunderstanding. Copy "mandate bespoke" jargon → "trading tailored to client needs" human-friendly.',
    category: 'IMPROVEMENT',
    releasedAt: '2026-05-15T06:00:00Z',
  },
  {
    version: '0.13.0',
    title: 'Locale-Aware Pricing (IDR untuk locale id, USD untuk en)',
    title_en: 'Locale-Aware Pricing (IDR for id locale, USD for en)',
    body: 'Semua pricing surface di-refactor jadi locale-aware:\n\n• ID locale: harga dalam Rupiah (Rp 299rb-4,9jt untuk Robot Meta, Rp 799rb-8,2jt untuk Robot Crypto)\n• EN locale: tetap USD ($19-299 untuk Robot Meta, $49-499 untuk Robot Crypto)\n\nSingle source of truth via lib/pricing-format.ts dengan PRICE_TABLE 20+ entries. Conversion rate 1 USD = Rp 16.500 dengan psychological rounding ke price point natural (Rp 299rb, bukan Rp 313.500). Plus mobile responsive fix supaya nominal IDR yang panjang tidak overflow di mobile.',
    body_en: 'All pricing surfaces refactored to be locale-aware:\n\n• ID locale: prices in Rupiah (Rp 299K-4.9M for Robot Meta, Rp 799K-8.2M for Robot Crypto)\n• EN locale: still USD ($19-299 for Robot Meta, $49-499 for Robot Crypto)\n\nSingle source of truth via lib/pricing-format.ts with PRICE_TABLE 20+ entries. Conversion rate 1 USD = Rp 16,500 with psychological rounding to natural price points (Rp 299K, not Rp 313,500). Plus mobile responsive fix so long IDR nominals do not overflow on mobile.',
    category: 'FEATURE',
    releasedAt: '2026-05-15T04:00:00Z',
  },
  {
    version: '0.12.0',
    title: '3 Strategi Inti + AI Brain (drift content cleanup)',
    title_en: '3 Core Strategies + AI Brain (drift content cleanup)',
    body: 'Editorial showcase dan copy site-wide direvisi untuk reflect backend reality:\n\n• "Enam strategi (SMC/Wyckoff/Astronacci/AI Momentum/Mean-Rev/Oil-Gas)" → "Tiga strategi inti + AI Brain"\n• 3 strategi: SMC Scalper (Quasimodo family), SMC Swing H1-H4, Pivot Mean Reversion\n• Subtitle "Lima pilar" → "Lima sorotan" supaya tidak konflik dengan platform 3-pillar\n\nPlus AI generated research artikel di-upgrade dengan instruksi anti-halusinasi, markdown formula/table, internal links awareness, dan SEO-friendly titles. Single source of truth di backend market-substrate-api (VPS1:8220).',
    body_en: 'Editorial showcase and site-wide copy revised to reflect backend reality:\n\n• "Six strategies (SMC/Wyckoff/Astronacci/AI Momentum/Mean-Rev/Oil-Gas)" → "Three core strategies + AI Brain"\n• 3 strategies: SMC Scalper (Quasimodo family), SMC Swing H1-H4, Pivot Mean Reversion\n• Subtitle "Five pillars" → "Five highlights" to avoid conflict with platform 3-pillar\n\nPlus AI generated research articles upgraded with anti-hallucination instructions, markdown formula/table, internal links awareness, and SEO-friendly titles. Single source of truth from backend market-substrate-api (VPS1:8220).',
    category: 'IMPROVEMENT',
    releasedAt: '2026-05-15T02:00:00Z',
  },
  {
    version: '0.11.0',
    title: 'Mobile Responsive Polish + Chat Collision Fix',
    title_en: 'Mobile Responsive Polish + Chat Collision Fix',
    body: 'Banyak fix untuk pengalaman mobile yang lebih baik:\n\n• Pricing card di homepage: text-2xl sm:text-3xl + flex-wrap + min-w-0 supaya nominal Rupiah panjang tidak overflow ke kanan layar\n• Tab pricing: horizontal scroll dengan snap supaya 6 tab tidak overflow di mobile\n• Mobile menu: pb-28 supaya last menu item tidak ketutup ChatWidget icon\n• ChatWidget auto-hide saat mobile menu open (MutationObserver detect)\n• Research detail page max-w-5xl supaya tabel + code + formula breathing room\n• prose-research responsive di mobile (font 0.9375rem, line-height 1.65, table compact)',
    body_en: 'Many fixes for a better mobile experience:\n\n• Homepage pricing card: text-2xl sm:text-3xl + flex-wrap + min-w-0 so long Rupiah nominals do not overflow right side\n• Pricing tabs: horizontal scroll with snap so 6 tabs do not overflow on mobile\n• Mobile menu: pb-28 so the last menu item is not covered by the ChatWidget icon\n• ChatWidget auto-hides when mobile menu opens (MutationObserver detect)\n• Research detail page max-w-5xl so tables + code + formulas have breathing room\n• prose-research responsive on mobile (font 0.9375rem, line-height 1.65, compact tables)',
    category: 'FIX',
    releasedAt: '2026-05-14T12:00:00Z',
  },
  {
    version: '0.10.0',
    title: 'Mega Menu Polish + Editorial Showcase Reframe',
    title_en: 'Mega Menu Polish + Editorial Showcase Reframe',
    body: 'Polish institutional grade untuk nav + landing:\n\n• Mega menu: dedupe URLs (3 about column ke /about, /about/team, /about/governance), tambah /changelog, /status di Resources, /legal/terms, /legal/privacy di Governance\n• Diversifikasi icon Solutions (Server, BookOpen, Sparkles, dst) supaya recognize cepat\n• Editorial showcase landing reframe ke "Tiga strategi inti + AI Brain" + "Lima sorotan"\n• Mobile menu padding fix dan ChatWidget auto-hide saat menu open',
    body_en: 'Institutional-grade polish for nav and landing:\n\n• Mega menu: dedupe URLs (3 about column → /about, /about/team, /about/governance), added /changelog, /status under Resources, /legal/terms, /legal/privacy under Governance\n• Diversify Solutions icons (Server, BookOpen, Sparkles, etc.) for quick recognition\n• Editorial showcase landing reframed to "Three core strategies + AI Brain" + "Five highlights"\n• Mobile menu padding fix and ChatWidget auto-hide when menu opens',
    category: 'IMPROVEMENT',
    releasedAt: '2026-05-13T15:00:00Z',
  },
];

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization') || '';
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let inserted = 0;
  let skipped = 0;
  for (const entry of SEED_ENTRIES) {
    const exists = await prisma.changelog.findUnique({
      where: { version: entry.version },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }
    await prisma.changelog.create({
      data: {
        version: entry.version,
        title: entry.title,
        title_en: entry.title_en,
        body: entry.body,
        body_en: entry.body_en,
        category: entry.category,
        releasedAt: new Date(entry.releasedAt),
        isPublished: true,
      },
    });
    inserted += 1;
  }

  return NextResponse.json({
    ok: true,
    inserted,
    skipped,
    totalSeedEntries: SEED_ENTRIES.length,
  });
}
