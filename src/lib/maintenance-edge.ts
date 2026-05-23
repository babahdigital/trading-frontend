/**
 * Edge-compatible maintenance state check.
 *
 * This module is safe for Edge Runtime — it does NOT import Prisma or any
 * Node.js-only packages. The middleware (src/proxy.ts) imports this instead
 * of maintenance.ts.
 *
 * Strategy: in-memory cache + internal fetch to /api/admin/maintenance (GET).
 * The API route uses Prisma on the Node.js side; this module only consumes
 * the JSON response.
 */

export interface MaintenanceState {
  enabled: boolean;
  message?: string;
  estimatedEnd?: string;
}

const DEFAULT_STATE: MaintenanceState = { enabled: false };

let edgeCached: { state: MaintenanceState; ts: number } | null = null;
const EDGE_CACHE_TTL = 30_000; // 30s
let fetchInFlight = false;

export async function getMaintenanceStateEdge(
  requestUrl: string,
): Promise<MaintenanceState> {
  // Return cached value if fresh
  if (edgeCached && Date.now() - edgeCached.ts < EDGE_CACHE_TTL) {
    return edgeCached.state;
  }

  // If a fetch is already in progress, return stale cache or default
  if (fetchInFlight) {
    return edgeCached?.state ?? DEFAULT_STATE;
  }

  // Build absolute URL for internal fetch
  const url = new URL('/api/admin/maintenance', requestUrl);

  fetchInFlight = true;
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'x-internal': '1' },
    });

    if (res.ok) {
      const data = (await res.json()) as MaintenanceState;
      const state: MaintenanceState = {
        enabled: !!data.enabled,
        message: data.message || undefined,
        estimatedEnd: data.estimatedEnd || undefined,
      };
      edgeCached = { state, ts: Date.now() };
      return state;
    }
  } catch {
    // Network/fetch error — fail-open
  } finally {
    fetchInFlight = false;
  }

  return edgeCached?.state ?? DEFAULT_STATE;
}
