/**
 * Populate FAQ.question_en + FAQ.answer_en via OpenRouter.
 *
 * The /api/public/faq endpoint already serves localized content via
 * `localizeFaq` — it falls back to Indonesian when `*_en` columns are
 * empty. This script fills those English columns so EN-locale visitors
 * see English FAQ answers from the CMS.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... \
 *   DATABASE_URL=postgresql://... \
 *   tsx scripts/translate-cms-faq.ts
 *
 *   --force      retranslate even rows that already have *_en populated
 *   --dry        list what would be translated, no API + no DB write
 *   --limit N    cap at N rows (debugging)
 *
 * Idempotent: safe to re-run. Without --force, rows with both `question_en`
 * and `answer_en` are skipped.
 */

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY = args.includes('--dry');
const LIMIT = (() => {
  const i = args.indexOf('--limit');
  if (i === -1) return Infinity;
  const n = parseInt(args[i + 1] ?? '', 10);
  return Number.isFinite(n) ? n : Infinity;
})();

const SYSTEM_PROMPT = `You are translating a fintech/trading platform FAQ from Indonesian to English.

Rules:
1. Translate VALUES only — preserve placeholder tokens like {name}, {amount}, /portal/...
2. Maintain a professional, institutional tone (Bloomberg, Goldman Sachs UI copy).
3. Brand names stay: BabahAlgo, CV Babah Digital, Robot Meta, Robot Crypto, MT5, Binance, Exness, MetaTrader 5.
4. Technical terms stay English: VPS, KYC, AUM, FAQ, API, SMC, Wyckoff, Astronacci, Fibonacci, Spot, Futures, scalping_momentum, ATR.
5. Currency stays as-is ($49/mo, USDT, $500).
6. Keep paragraph structure when present (split by line breaks).
7. Output ONLY the translated text, no explanations, no quotes.`;

async function translate(text: string, openrouter: ReturnType<typeof createOpenAI>): Promise<string> {
  const { text: result } = await generateText({
    model: openrouter('google/gemini-2.5-flash-lite'),
    system: SYSTEM_PROMPT,
    prompt: `Translate this Indonesian FAQ text to English. Output ONLY the translation.\n\nInput: ${text}`,
    temperature: 0.2,
  });
  let en = result.trim();
  if ((en.startsWith('"') && en.endsWith('"')) || (en.startsWith("'") && en.endsWith("'"))) {
    en = en.slice(1, -1);
  }
  return en;
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey && !DRY) {
    console.error('✗ OPENROUTER_API_KEY not set. Get one at https://openrouter.ai/keys');
    process.exit(1);
  }

  const all = await prisma.faq.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });

  const candidates = all.filter((f) => {
    if (FORCE) return true;
    return !f.question_en || !f.answer_en;
  }).slice(0, LIMIT);

  console.log(`Found ${all.length} total FAQs. ${candidates.length} candidate(s)${FORCE ? ' (--force)' : ''}.`);
  if (candidates.length === 0) {
    console.log('Nothing to translate.');
    await prisma.$disconnect();
    return;
  }

  if (DRY) {
    console.log('\nDry run — would translate:');
    for (const f of candidates) {
      console.log(`  [${f.category}] ${f.question.slice(0, 80)}`);
    }
    await prisma.$disconnect();
    return;
  }

  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey!,
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com',
      'X-Title': 'BabahAlgo FAQ translation',
    },
  });

  console.log('\nTranslating via OpenRouter (Gemini 2.5 Flash Lite)...\n');

  let ok = 0;
  let failed = 0;
  for (const f of candidates) {
    try {
      const [qEn, aEn] = await Promise.all([
        translate(f.question, openrouter),
        translate(f.answer, openrouter),
      ]);
      await prisma.faq.update({
        where: { id: f.id },
        data: { question_en: qEn, answer_en: aEn },
      });
      ok++;
      process.stdout.write(`  ✓ [${f.category}] ${f.question.slice(0, 50).padEnd(50)} → ${qEn.slice(0, 50)}\n`);
    } catch (err) {
      failed++;
      console.error(`  ✗ [${f.category}] ${f.question.slice(0, 50)} — ${String(err).slice(0, 100)}`);
    }
  }

  console.log(`\n✓ Translated ${ok}/${candidates.length}. Failed: ${failed}.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('✗ Failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
