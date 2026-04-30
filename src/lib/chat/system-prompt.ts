/**
 * System prompt assembler — modular skill composition.
 *
 * Architecture:
 *   - Identity (always): persona + language lock + format rules.
 *   - Global skill (always): perusahaan, produk umum, pricing tinggi,
 *     keamanan, onboarding paths.
 *   - Forex skill (lazy): hanya inject saat percakapan menyangkut forex
 *     / MT5 / SMC / Wyckoff / metals / energy.
 *   - Crypto skill (lazy): hanya inject saat percakapan menyangkut crypto
 *     / Binance / BTC / ETH / leverage.
 *   - Authenticated context (when logged in): user name, tier, floating
 *     P&L, kill-switch status. Anonymous fallback otherwise.
 *
 * Lazy loading menghemat prompt budget — pertanyaan crypto-only tidak
 * memuat seluruh detail forex strategi, dan sebaliknya. Skill detection
 * pakai keyword match sederhana di lib/chat/skills/{forex,crypto}.ts.
 *
 * Future expansion: tambah skill modules di lib/chat/skills/ — misal
 * vps.ts (VPS license), institutional.ts (B2B), atau api.ts (developer
 * API integration). Compose-able tanpa menyentuh chat route.
 */

import { buildIdentitySection } from './skills/identity';
import { GLOBAL_SKILL } from './skills/global';
import { FOREX_SKILL, isForexTopic } from './skills/forex';
import { CRYPTO_SKILL, isCryptoTopic } from './skills/crypto';
import { buildAuthenticatedSkill, ANONYMOUS_CONTEXT, type AuthenticatedContext } from './skills/authenticated';
import type { ChatLocale, ChatPromptContext } from './types';

export type { ChatLocale };
export type { AuthenticatedContext };

export function buildSystemPrompt(localeOrContext: ChatLocale | ChatPromptContext): string {
  // Backward-compat: caller lama yang masih pakai buildSystemPrompt('id') tetap works.
  const ctx: ChatPromptContext =
    typeof localeOrContext === 'string'
      ? { locale: localeOrContext, recentUserText: '' }
      : localeOrContext;

  const sections: string[] = [];

  sections.push(buildIdentitySection(ctx.locale));
  sections.push(GLOBAL_SKILL);

  const txt = ctx.recentUserText.toLowerCase();
  const forexHit = isForexTopic(txt);
  const cryptoHit = isCryptoTopic(txt);

  // Heuristic: kalau tidak ada hit jelas, load FOREX as default karena mayoritas
  // customer dan landing page condong ke forex. Crypto-specific muncul saat
  // user spesifik nyebut crypto/Binance.
  if (forexHit || (!forexHit && !cryptoHit)) {
    sections.push(FOREX_SKILL);
  }
  if (cryptoHit) {
    sections.push(CRYPTO_SKILL);
  }

  if (ctx.authenticated) {
    sections.push(buildAuthenticatedSkill(ctx.authenticated));
  } else {
    sections.push(ANONYMOUS_CONTEXT);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Backward-compatible default — assumes English when locale unknown,
 * anonymous + global skill only.
 */
export const BABAH_SYSTEM_PROMPT = buildSystemPrompt({
  locale: 'en',
  recentUserText: '',
});
