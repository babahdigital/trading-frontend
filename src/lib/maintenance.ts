import { prisma } from '@/lib/db/prisma';

export interface MaintenanceState {
  enabled: boolean;
  message?: string;
  estimatedEnd?: string;
}

const DEFAULT_STATE: MaintenanceState = { enabled: false };

let cached: { state: MaintenanceState; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Read maintenance state from SiteSetting (key = "maintenance_mode").
 * Result is cached in-process for 30s to avoid DB queries on every request.
 * This function is for use in Node.js (API routes, server components).
 * Edge middleware uses the lightweight getMaintenanceStateEdge() below.
 */
export async function getMaintenanceState(): Promise<MaintenanceState> {
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.state;

  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: 'maintenance_mode' },
    });

    if (!row) {
      cached = { state: DEFAULT_STATE, ts: Date.now() };
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(row.value) as MaintenanceState;
    const state: MaintenanceState = {
      enabled: !!parsed.enabled,
      message: parsed.message || undefined,
      estimatedEnd: parsed.estimatedEnd || undefined,
    };

    cached = { state, ts: Date.now() };
    return state;
  } catch {
    // On DB error, fail-open (don't block the whole site)
    return cached?.state ?? DEFAULT_STATE;
  }
}

/**
 * Update maintenance state in SiteSetting. Invalidates cache immediately.
 */
export async function setMaintenanceState(state: MaintenanceState): Promise<MaintenanceState> {
  const value = JSON.stringify({
    enabled: !!state.enabled,
    message: state.message || '',
    estimatedEnd: state.estimatedEnd || '',
  });

  await prisma.siteSetting.upsert({
    where: { key: 'maintenance_mode' },
    update: { value, type: 'json' },
    create: { key: 'maintenance_mode', value, type: 'json' },
  });

  // Invalidate cache immediately so next read reflects the change
  cached = null;

  return {
    enabled: !!state.enabled,
    message: state.message || undefined,
    estimatedEnd: state.estimatedEnd || undefined,
  };
}

// Edge-compatible version is in maintenance-edge.ts (no Prisma import).
