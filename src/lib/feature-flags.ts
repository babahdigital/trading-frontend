/**
 * Feature Flag System — DB-backed via SiteSettings, hot-reloadable (no redeploy).
 *
 * Pak Abdullah audit 2026-05-22 directive: "sistem harus dynamis adaptif dan
 * automatis zero touch human". Feature flags previously env-var only =
 * required redeploy untuk toggle. Now stored di SiteSettings table dengan
 * key pattern `feature:<name>` + boolean type.
 *
 * Backward compat: kalau SiteSetting missing untuk a flag, fallback ke
 * env var dengan UPPERCASE_SNAKE_CASE format (mis. 'enable_signal_consumer'
 * → ENABLE_SIGNAL_CONSUMER env). Memungkinkan smooth migration.
 *
 * Cache: in-memory 30s TTL — admin toggle effects propagated within 30s
 * tanpa restart container.
 *
 * Usage:
 *   import { isFeatureEnabled } from '@/lib/feature-flags';
 *   if (await isFeatureEnabled('enable_signal_consumer')) { ... }
 */
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('feature-flags');

const CACHE_TTL_MS = 30_000;
interface CacheEntry { value: string; ts: number }
const cache = new Map<string, CacheEntry>();

const FEATURE_KEY_PREFIX = 'feature:';

/** Normalize flag name → SiteSetting key. */
function flagKey(name: string): string {
  return `${FEATURE_KEY_PREFIX}${name.toLowerCase()}`;
}

/** Normalize flag name → env var name (backward compat). */
function envKey(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

/** Read raw string value dari cache → DB → env. Returns null kalau no source. */
async function readFlagValue(name: string): Promise<string | null> {
  const key = flagKey(name);

  // Cache layer
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.value;
  }

  // DB layer
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key } });
    if (setting) {
      cache.set(key, { value: setting.value, ts: Date.now() });
      return setting.value;
    }
  } catch (err) {
    log.warn(`DB lookup failed for ${key}: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // Env fallback (backward compat)
  const envVal = process.env[envKey(name)];
  if (envVal !== undefined) {
    cache.set(key, { value: envVal, ts: Date.now() });
    return envVal;
  }

  return null;
}

/** Check boolean feature flag — returns true/false. Default `false` kalau missing. */
export async function isFeatureEnabled(name: string, defaultValue = false): Promise<boolean> {
  const value = await readFlagValue(name);
  if (value === null) return defaultValue;
  return value === 'true' || value === '1' || value === 'on' || value === 'yes';
}

/** Get raw flag value (untuk non-boolean flags). */
export async function getFeatureFlag(name: string, defaultValue: string | null = null): Promise<string | null> {
  const value = await readFlagValue(name);
  return value ?? defaultValue;
}

/** Set flag value — admin-only operation. Invalidates cache. */
export async function setFeatureFlag(name: string, value: string, type: 'boolean' | 'string' | 'number' | 'json' = 'string'): Promise<void> {
  const key = flagKey(name);
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value, type },
    update: { value, type },
  });
  cache.delete(key);
  log.info(`Feature flag updated: ${key} = ${value}`);
}

/** Bulk read flags — efisien untuk admin UI list. */
export async function listFeatureFlags(): Promise<Array<{ name: string; key: string; value: string; type: string; updatedAt: Date }>> {
  const settings = await prisma.siteSetting.findMany({
    where: { key: { startsWith: FEATURE_KEY_PREFIX } },
    orderBy: { key: 'asc' },
  });
  return settings.map((s) => ({
    name: s.key.replace(FEATURE_KEY_PREFIX, ''),
    key: s.key,
    value: s.value,
    type: s.type,
    updatedAt: s.updatedAt,
  }));
}

/** Clear cache — useful untuk testing atau immediate refresh. */
export function clearFeatureFlagCache(): void {
  cache.clear();
}
