/**
 * Strategy stats fetcher — server-side helper untuk render dynamic WR/RR
 * di halaman /platform/strategies + [slug] tanpa hardcode angka.
 *
 * Dipanggil dari server component (Next.js RSC). Gunakan absolute URL
 * (resolved via NEXT_PUBLIC_APP_URL fallback localhost) supaya bisa fetch
 * `/api/public/strategy-stats` saat server-side render.
 *
 * Saat backend belum ship endpoint stats, semua field return null →
 * komponen render placeholder `—` + label "Publikasi Q3 2026".
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('lib/strategy-stats');

export interface StrategyStat {
  winRate: number | null;
  avgRR: number | null;
  avgHoldMinutes: number | null;
  maxConsecutiveLoss: number | null;
  sampleSize: number | null;
  lastUpdated: string | null;
}

export interface StrategyStatsPayload {
  source: 'backend' | 'pending';
  stats: Record<string, StrategyStat | null>;
}

function emptyPayload(): StrategyStatsPayload {
  return { source: 'pending', stats: {} };
}

function siteBase(): string {
  // Server-side: prefer absolute supaya Node fetch tidak fail karena relatif.
  // Di production VPS3, NEXT_PUBLIC_APP_URL=https://babahalgo.com.
  // Saat lokal dev / CI: fallback ke localhost:3000.
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url && /^https?:/.test(url)) return url.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export async function getStrategyStats(): Promise<StrategyStatsPayload> {
  try {
    const res = await fetch(`${siteBase()}/api/public/strategy-stats`, {
      next: { revalidate: 300 }, // ISR 5 menit
    });
    if (!res.ok) {
      log.warn(`strategy-stats fetch HTTP ${res.status}`);
      return emptyPayload();
    }
    const body = (await res.json()) as StrategyStatsPayload;
    if (body && typeof body === 'object' && body.stats) {
      return body;
    }
    return emptyPayload();
  } catch (err) {
    log.warn(`strategy-stats fetch error: ${err instanceof Error ? err.message : 'unknown'}`);
    return emptyPayload();
  }
}

export function formatWinRate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

export function formatRR(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `1:${value.toFixed(1)}`;
}

export function formatHoldMinutes(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes - hours * 60);
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatCount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return String(Math.round(value));
}
