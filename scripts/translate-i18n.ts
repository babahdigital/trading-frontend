/**
 * i18n Sync — auto-translate id.json (canonical source) ke en.json via OpenRouter.
 *
 * Strategy:
 * - id.json = source of truth (Bahasa Indonesia, hand-authored)
 * - en.json = generated mirror (English, auto-translated)
 *
 * Behavior:
 * - Walks id.json recursively, mengikuti struktur key persis
 * - Untuk setiap leaf string, cek apakah en.json sudah punya translation
 *   yang corresponds ke nilai id.json yang sama (cache via .i18n-cache.json)
 * - Kalau belum / id text berubah, batch-translate via OpenRouter
 * - Output en.json dengan struktur identik
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... npm run i18n:sync
 *   OPENROUTER_API_KEY=sk-or-... npm run i18n:sync -- --force   # re-translate all
 *
 * Dry-run: tambah --dry untuk lihat keys yang akan di-translate tanpa call API.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const ROOT = resolve(__dirname, '..');
const ID_PATH = resolve(ROOT, 'src/i18n/messages/id.json');
const EN_PATH = resolve(ROOT, 'src/i18n/messages/en.json');
const CACHE_PATH = resolve(ROOT, 'src/i18n/messages/.i18n-cache.json');

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

interface Cache {
  // hash(id_text) -> en_text
  [idText: string]: string;
}

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY = args.includes('--dry');

const SYSTEM_PROMPT = `You are translating a fintech/trading platform UI from Indonesian to English.

Rules:
1. Translate VALUES only — preserve any placeholder tokens like {name}, {seconds}, {year}, {field}, {retryAfter}.
2. Maintain a professional, institutional tone (think Bloomberg, Goldman Sachs UI copy — concise, confident, no marketing fluff).
3. Keep brand names unchanged: BabahAlgo, CV Babah Digital, Robot Meta, Robot Crypto, MT5, Binance, Exness, MetaTrader 5.
4. Keep technical/product terms in English when commonly used: VPS, KYC, AUM, FAQ, CTA, ROI, API, SMC, Wyckoff, Astronacci, Fibonacci.
5. Keep short labels short — don't pad ("Daftar" → "Sign Up", not "Register an account").
6. For section eyebrows (UPPERCASE labels like "HARGA", "FAQ"), translate to UPPERCASE English equivalents ("PRICING", "FAQ").
7. Currency stays as-is ($49/mo, Rp 300K).
8. Time/date format stays as-is ("/bln" → "/mo", "24/7" stays).
9. Output ONLY the translated text — no explanations, no quotes around it, no JSON wrapping.`;

async function translateBatch(items: { key: string; id: string }[]): Promise<{ key: string; en: string }[]> {
  if (items.length === 0) return [];
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set in env. Get one at https://openrouter.ai/keys');
  }
  const or = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com',
      'X-Title': 'BabahAlgo i18n sync',
    },
  });

  // Translate one at a time (Gemini Flash Lite cheap + accurate per-string)
  const results: { key: string; en: string }[] = [];
  for (const item of items) {
    const { text } = await generateText({
      model: or('google/gemini-2.5-flash-lite'),
      system: SYSTEM_PROMPT,
      prompt: `Translate this Indonesian UI string to English. Output ONLY the translation, nothing else.\n\nInput: ${item.id}`,
      temperature: 0.2,
    });
    let en = text.trim();
    // Strip surrounding quotes if model added them
    if ((en.startsWith('"') && en.endsWith('"')) || (en.startsWith("'") && en.endsWith("'"))) {
      en = en.slice(1, -1);
    }
    results.push({ key: item.key, en });
    process.stdout.write(`  ✓ ${item.key.padEnd(50)} ${item.id.slice(0, 40).padEnd(40)} → ${en.slice(0, 50)}\n`);
  }
  return results;
}

function flattenStrings(obj: JsonValue, prefix = ''): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  if (typeof obj === 'string') {
    out.push({ key: prefix, value: obj });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      out.push(...flattenStrings(item, `${prefix}[${i}]`));
    });
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${k}` : k;
      out.push(...flattenStrings(v, next));
    }
  }
  return out;
}

function setByPath(target: JsonObject, path: string, value: string): void {
  // Path uses dot for object, [n] for array index. e.g. foo.bar[0].baz
  const parts: (string | number)[] = [];
  const re = /([^.\[\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) parts.push(m[1]);
    else parts.push(parseInt(m[2], 10));
  }

  let cursor: JsonValue = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof p === 'number' && Array.isArray(cursor)) {
      cursor = cursor[p];
    } else if (cursor && typeof cursor === 'object' && !Array.isArray(cursor)) {
      cursor = (cursor as JsonObject)[p as string];
    }
  }
  const last = parts[parts.length - 1];
  if (typeof last === 'number' && Array.isArray(cursor)) {
    cursor[last] = value;
  } else if (cursor && typeof cursor === 'object' && !Array.isArray(cursor)) {
    (cursor as JsonObject)[last as string] = value;
  }
}

function getByPath(obj: JsonValue, path: string): JsonValue | undefined {
  const parts: (string | number)[] = [];
  const re = /([^.\[\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) parts.push(m[1]);
    else parts.push(parseInt(m[2], 10));
  }
  let cursor: JsonValue | undefined = obj;
  for (const p of parts) {
    if (cursor === undefined || cursor === null) return undefined;
    if (typeof p === 'number' && Array.isArray(cursor)) cursor = cursor[p];
    else if (typeof cursor === 'object' && !Array.isArray(cursor)) cursor = (cursor as JsonObject)[p as string];
    else return undefined;
  }
  return cursor;
}

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

async function main() {
  if (!existsSync(ID_PATH)) {
    console.error(`✗ ${ID_PATH} not found`);
    process.exit(1);
  }

  const idJson: JsonObject = JSON.parse(readFileSync(ID_PATH, 'utf-8'));
  const enJson: JsonObject = existsSync(EN_PATH) ? JSON.parse(readFileSync(EN_PATH, 'utf-8')) : {};
  const cache: Cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) : {};

  const flat = flattenStrings(idJson);
  console.log(`Found ${flat.length} string leaves in id.json`);

  const toTranslate: { key: string; id: string }[] = [];
  const out: JsonObject = deepClone(enJson);

  // Pre-fill from id structure if en.json missing keys (so structure mirrors id.json)
  // We'll set translations in a second pass.
  for (const { key, value } of flat) {
    const existingEn = getByPath(enJson, key);
    const cachedEn = cache[value];

    if (FORCE) {
      toTranslate.push({ key, id: value });
    } else if (cachedEn && (!existingEn || existingEn === '__needs_translation__')) {
      // Use cache hit
      setByPath(out, key, cachedEn);
    } else if (cachedEn && existingEn !== cachedEn) {
      // Cache exists but en.json is out of sync — refresh from cache
      setByPath(out, key, cachedEn);
    } else if (typeof existingEn === 'string' && existingEn.length > 0 && existingEn !== '__needs_translation__') {
      // en.json already has a translation; trust it. Refresh cache for next runs.
      cache[value] = existingEn;
    } else {
      toTranslate.push({ key, id: value });
    }
  }

  console.log(`${toTranslate.length} keys need translation${FORCE ? ' (--force)' : ''}.`);

  if (DRY) {
    console.log('\nDry run — would translate:');
    for (const t of toTranslate) {
      console.log(`  ${t.key}  ←  "${t.id.slice(0, 80)}"`);
    }
    // CI gating: jika --dry dipakai sebagai parity check, exit 1 supaya
    // pipeline gagal kalau ada keys missing. Ini yang bikin "i18n parity"
    // jadi enforced di CI tanpa bikin file validator terpisah.
    if (toTranslate.length > 0) {
      console.error(`\n✗ ${toTranslate.length} keys missing translations. Run "npm run i18n:sync" untuk fix.`);
      process.exit(1);
    }
    console.log('\n✓ All keys translated. id.json + en.json sinkron.');
    return;
  }

  if (toTranslate.length > 0) {
    console.log('\nTranslating via OpenRouter (Gemini 2.5 Flash Lite)...\n');
    const results = await translateBatch(toTranslate);
    for (const { key, en } of results) {
      setByPath(out, key, en);
      const idVal = flat.find((f) => f.key === key)?.value;
      if (idVal) cache[idVal] = en;
    }
  }

  // Write outputs (alphabetical key sort matches id.json's natural author order — we just preserve structure)
  // Important: output should match id.json key ordering exactly so diffs stay clean.
  const ordered = mirrorStructure(idJson, out);

  writeFileSync(EN_PATH, JSON.stringify(ordered, null, 2) + '\n', 'utf-8');
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');

  console.log(`\n✓ Wrote ${EN_PATH}`);
  console.log(`✓ Wrote ${CACHE_PATH}`);
}

/** Build an output object that mirrors `template`'s structure, pulling values from `source`.
 *  Falls back to template value (Indonesian) for any key missing in source. */
function mirrorStructure(template: JsonValue, source: JsonValue): JsonValue {
  if (typeof template === 'string') {
    return typeof source === 'string' ? source : template;
  }
  if (Array.isArray(template)) {
    const srcArr = Array.isArray(source) ? source : [];
    return template.map((item, i) => mirrorStructure(item, srcArr[i]));
  }
  if (template && typeof template === 'object') {
    const out: JsonObject = {};
    const srcObj = source && typeof source === 'object' && !Array.isArray(source) ? (source as JsonObject) : {};
    for (const [k, v] of Object.entries(template)) {
      out[k] = mirrorStructure(v, srcObj[k]);
    }
    return out;
  }
  return template;
}

main().catch((err) => {
  console.error('✗ Failed:', err);
  process.exit(1);
});
