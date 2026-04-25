/**
 * Geo-IP fallback resolver — used by middleware when CF-IPCountry header
 * absent (non-Cloudflare path or local dev).
 *
 * Uses ipapi.co (free tier, no API key) as primary fallback, with strict
 * timeout + in-memory cache to keep middleware latency bounded. Caches
 * misses too so a single failure doesn't trigger repeat outbound calls.
 *
 * Returns `'ID'` | `'EN'` | `null`. Caller must default-fallback to a sane
 * locale (typically EN) when null.
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_TIMEOUT_MS = 1500;
const NEGATIVE_TTL_MS = 5 * 60 * 1000; // re-try misses after 5 min

interface CachedEntry {
  country: string | null;
  expiresAt: number;
}

const cache = new Map<string, CachedEntry>();

function getCached(ip: string): CachedEntry | null {
  const entry = cache.get(ip);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(ip);
    return null;
  }
  return entry;
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  // 172.16.0.0 – 172.31.255.255
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    if (parts.length >= 2) {
      const second = Number(parts[1]);
      if (second >= 16 && second <= 31) return true;
    }
  }
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;
  return false;
}

/**
 * Resolve country code (ISO-2) via ipapi.co. Returns null on failure or
 * private/unknown IP. Caches both hits and misses to avoid repeated calls.
 */
export async function resolveCountryByIp(ip: string): Promise<string | null> {
  if (isPrivateIp(ip)) return null;

  const cached = getCached(ip);
  if (cached) return cached.country;

  // Avoid running on the build/edge if explicitly disabled
  if (process.env.GEOIP_FALLBACK_DISABLED === '1') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FALLBACK_TIMEOUT_MS);

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
      headers: { 'User-Agent': 'babahalgo-frontend/1.0' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!res.ok) {
      cache.set(ip, { country: null, expiresAt: Date.now() + NEGATIVE_TTL_MS });
      return null;
    }

    const country = (await res.text()).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      cache.set(ip, { country: null, expiresAt: Date.now() + NEGATIVE_TTL_MS });
      return null;
    }

    cache.set(ip, { country, expiresAt: Date.now() + CACHE_TTL_MS });
    return country;
  } catch {
    clearTimeout(timer);
    cache.set(ip, { country: null, expiresAt: Date.now() + NEGATIVE_TTL_MS });
    return null;
  }
}
