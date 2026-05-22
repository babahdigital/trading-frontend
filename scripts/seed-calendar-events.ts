/**
 * Seed CalendarEvent — Indonesia + international events untuk AI Promo
 * Strategist context. Strategist query upcoming events (next 14 days) untuk
 * decide greeting/discount.
 *
 * Run yearly (atau saat onboarding new year):
 *   docker exec trading-commercial-app-1 npx tsx scripts/seed-calendar-events.ts
 *
 * Date calculation: Hijri/Lunar events (Lebaran/Idul Adha/Imlek) approximate;
 * fine-tune via admin UI yearly. Fixed-date events (Natal/HUT RI/Tahun Baru)
 * deterministic.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EventSeed {
  slug: string;
  templateKey: string;
  name: string;
  name_en: string;
  /** Per-year date — multi-year array */
  dates: Record<number, string>;  // year → YYYY-MM-DD
  leadDays: number;
  country: 'ID' | 'INTL';
}

// 2026-2027 events (Pak Abdullah revisit yearly via admin UI atau cron annual).
// Hijri dates are approximation per Indonesian Ministry of Religion projections.
const EVENTS: EventSeed[] = [
  // ─── Indonesia national + religious ─────────────────────────────────
  {
    slug: 'tahun-baru', templateKey: 'tahun-baru',
    name: 'Tahun Baru Masehi', name_en: 'New Year',
    dates: { 2026: '2026-01-01', 2027: '2027-01-01' },
    leadDays: 7, country: 'INTL', // 2026-05-22 — universal event
  },
  {
    slug: 'imlek', templateKey: 'imlek',
    name: 'Tahun Baru Imlek', name_en: 'Chinese New Year',
    dates: { 2026: '2026-02-17', 2027: '2027-02-06' },
    leadDays: 7, country: 'ID',
  },
  {
    slug: 'nyepi', templateKey: 'nyepi',
    name: 'Hari Raya Nyepi', name_en: 'Day of Silence (Nyepi)',
    dates: { 2026: '2026-03-19', 2027: '2027-03-09' },
    leadDays: 7, country: 'ID',
  },
  {
    slug: 'lebaran', templateKey: 'lebaran',
    name: 'Idul Fitri', name_en: 'Eid al-Fitr',
    // Hijri-based — ~Apr 1 2026, ~Mar 21 2027 (estimate, verify per year)
    dates: { 2026: '2026-04-01', 2027: '2027-03-21' },
    leadDays: 10, country: 'ID',
  },
  {
    slug: 'waisak', templateKey: 'waisak',
    name: 'Hari Raya Waisak', name_en: 'Vesak Day',
    dates: { 2026: '2026-05-23', 2027: '2027-05-12' },
    leadDays: 7, country: 'ID',
  },
  {
    slug: 'pancasila', templateKey: 'pancasila',
    name: 'Hari Lahir Pancasila', name_en: 'Pancasila Day',
    dates: { 2026: '2026-06-01', 2027: '2027-06-01' },
    leadDays: 7, country: 'ID',
  },
  {
    slug: 'idul-adha', templateKey: 'idul-adha',
    name: 'Idul Adha', name_en: 'Eid al-Adha',
    dates: { 2026: '2026-06-08', 2027: '2027-05-28' },
    leadDays: 7, country: 'ID',
  },
  {
    slug: 'hut-ri', templateKey: 'hut-ri',
    name: 'HUT Kemerdekaan RI', name_en: 'Indonesian Independence Day',
    dates: { 2026: '2026-08-17', 2027: '2027-08-17' },
    leadDays: 7, country: 'ID',
  },
  {
    slug: 'natal', templateKey: 'natal',
    name: 'Natal', name_en: 'Christmas',
    dates: { 2026: '2026-12-25', 2027: '2027-12-25' },
    leadDays: 14, country: 'INTL', // 2026-05-22 — universal event
  },

  // ─── International commerce events ──────────────────────────────────
  {
    slug: 'black-friday', templateKey: 'black-friday',
    name: 'Black Friday', name_en: 'Black Friday',
    dates: { 2026: '2026-11-27', 2027: '2027-11-26' }, // 4th Friday November
    leadDays: 7, country: 'INTL',
  },
  {
    slug: 'cyber-monday', templateKey: 'cyber-monday',
    name: 'Cyber Monday', name_en: 'Cyber Monday',
    dates: { 2026: '2026-11-30', 2027: '2027-11-29' },
    leadDays: 7, country: 'INTL',
  },
  {
    slug: 'singles-day', templateKey: 'singles-day',
    name: 'Hari Belanja Online (11.11)', name_en: 'Singles Day (11.11)',
    dates: { 2026: '2026-11-11', 2027: '2027-11-11' },
    leadDays: 7, country: 'INTL',
  },
  {
    slug: 'hari-belanja-online-1212', templateKey: 'harbolnas-1212',
    name: 'Harbolnas 12.12', name_en: 'Online Shopping Day 12.12',
    dates: { 2026: '2026-12-12', 2027: '2027-12-12' },
    leadDays: 7, country: 'ID',
  },

  // ─── Trading milestone events ───────────────────────────────────────
  {
    slug: 'tahun-baru-fiskal', templateKey: 'fiscal-year',
    name: 'Tahun Baru Fiskal', name_en: 'New Fiscal Year',
    dates: { 2026: '2026-04-01', 2027: '2027-04-01' },
    leadDays: 7, country: 'INTL',
  },

  // ─── Indonesia national milestones (audit 2026-05-22 — expanded) ───
  {
    slug: 'hari-buruh', templateKey: 'hari-buruh',
    name: 'Hari Buruh Internasional', name_en: 'Labour Day',
    dates: { 2026: '2026-05-01', 2027: '2027-05-01' },
    leadDays: 5, country: 'ID',
  },
  {
    slug: 'hari-pendidikan', templateKey: 'hari-pendidikan',
    name: 'Hari Pendidikan Nasional', name_en: 'National Education Day',
    dates: { 2026: '2026-05-02', 2027: '2027-05-02' },
    leadDays: 5, country: 'ID',
  },
  {
    slug: 'hari-kartini', templateKey: 'hari-kartini',
    name: 'Hari Kartini', name_en: 'Kartini Day (Women Empowerment)',
    dates: { 2026: '2026-04-21', 2027: '2027-04-21' },
    leadDays: 5, country: 'ID',
  },
  {
    slug: 'hari-anak-nasional', templateKey: 'hari-anak-nasional',
    name: 'Hari Anak Nasional', name_en: 'National Children Day',
    dates: { 2026: '2026-07-23', 2027: '2027-07-23' },
    leadDays: 5, country: 'ID',
  },
  {
    slug: 'hari-sumpah-pemuda', templateKey: 'hari-sumpah-pemuda',
    name: 'Hari Sumpah Pemuda', name_en: 'Youth Pledge Day',
    dates: { 2026: '2026-10-28', 2027: '2027-10-28' },
    leadDays: 5, country: 'ID',
  },
  {
    slug: 'hari-pahlawan', templateKey: 'hari-pahlawan',
    name: 'Hari Pahlawan', name_en: 'Heroes Day',
    dates: { 2026: '2026-11-10', 2027: '2027-11-10' },
    leadDays: 5, country: 'ID',
  },
  {
    slug: 'hari-ibu', templateKey: 'hari-ibu',
    name: 'Hari Ibu', name_en: 'Mother\'s Day Indonesia',
    dates: { 2026: '2026-12-22', 2027: '2027-12-22' },
    leadDays: 7, country: 'ID',
  },

  // ─── International major (audit 2026-05-22 — expanded) ─────────────
  {
    slug: 'valentine', templateKey: 'valentine',
    name: 'Hari Valentine', name_en: 'Valentine\'s Day',
    dates: { 2026: '2026-02-14', 2027: '2027-02-14' },
    leadDays: 7, country: 'INTL',
  },
  {
    slug: 'hari-perempuan-internasional', templateKey: 'womens-day',
    name: 'Hari Perempuan Internasional', name_en: 'International Women\'s Day',
    dates: { 2026: '2026-03-08', 2027: '2027-03-08' },
    leadDays: 5, country: 'INTL',
  },
  {
    slug: 'easter', templateKey: 'easter',
    name: 'Paskah', name_en: 'Easter',
    // Computus algorithm — 2026: Apr 5, 2027: Mar 28
    dates: { 2026: '2026-04-05', 2027: '2027-03-28' },
    leadDays: 7, country: 'INTL',
  },
  {
    slug: 'halloween', templateKey: 'halloween',
    name: 'Halloween', name_en: 'Halloween',
    dates: { 2026: '2026-10-31', 2027: '2027-10-31' },
    leadDays: 7, country: 'INTL',
  },
  {
    slug: 'thanksgiving', templateKey: 'thanksgiving',
    name: 'Thanksgiving', name_en: 'Thanksgiving',
    // 4th Thursday November — 2026: Nov 26, 2027: Nov 25
    dates: { 2026: '2026-11-26', 2027: '2027-11-25' },
    leadDays: 5, country: 'INTL',
  },
];

async function main() {
  // Seed semua tahun yang ada di dates record. Default current + next year.
  const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
  let seededCount = 0;

  for (const event of EVENTS) {
    for (const year of years) {
      const dateStr = event.dates[year];
      if (!dateStr) {
        console.log(`  ⊘ ${event.slug} ${year} — no date defined, skip`);
        continue;
      }
      const slug = `${event.slug}-${year}`;
      const eventDate = new Date(`${dateStr}T00:00:00Z`);
      const result = await prisma.calendarEvent.upsert({
        where: { slug },
        create: {
          slug,
          templateKey: event.templateKey,
          name: event.name,
          name_en: event.name_en,
          eventDate,
          leadDays: event.leadDays,
          country: event.country,
          isActive: true,
        },
        update: {
          eventDate,
          leadDays: event.leadDays,
          country: event.country,
        },
      });
      console.log(`  ✓ ${result.slug} (${event.country}) → ${dateStr} (lead ${event.leadDays}d)`);
      seededCount++;
    }
  }
  console.log(`✓ Seeded ${seededCount} calendar events`);
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
