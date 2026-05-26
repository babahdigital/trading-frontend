/**
 * Feature Flag Registry — canonical list of all known flags with metadata.
 *
 * Provides type-safe access to feature flags. Instead of bare string
 * `isFeatureEnabled('enable_signal_consumer')`, use:
 *   `isKnownFlagEnabled('SIGNAL_CONSUMER')`
 *
 * Benefits:
 *   - No typo risk (TypeScript catches invalid flag names)
 *   - Auto-discovery (admin UI can list all known flags)
 *   - Self-documenting (description + default per flag)
 */

import { isFeatureEnabled } from './feature-flags';

export interface FlagSpec {
  name: string;
  dbKey: string;
  description: string;
  defaultValue: boolean;
  category: 'worker' | 'feature' | 'experiment' | 'maintenance';
}

export const FLAG_REGISTRY = {
  SIGNAL_CONSUMER: {
    name: 'Signal Consumer',
    dbKey: 'enable_signal_consumer',
    description: 'VPS1 signal ingestion worker (30s interval)',
    defaultValue: false,
    category: 'worker',
  },
  TRADE_EVENTS_CONSUMER: {
    name: 'Trade Events Consumer',
    dbKey: 'enable_trade_events_consumer',
    description: 'VPS1 trade event sync worker (20s interval)',
    defaultValue: false,
    category: 'worker',
  },
  RESEARCH_INGESTER: {
    name: 'Research Ingester',
    dbKey: 'enable_research_ingester',
    description: 'Research data ingestion from VPS1 (6h interval)',
    defaultValue: false,
    category: 'worker',
  },
  PAIR_BRIEF_WORKER: {
    name: 'Pair Brief Worker',
    dbKey: 'enable_pair_brief_worker',
    description: 'AI pair brief generation worker (4h interval)',
    defaultValue: false,
    category: 'worker',
  },
  BLOG_GENERATOR: {
    name: 'Blog Generator',
    dbKey: 'enable_blog_generator',
    description: 'AI blog article generation (12h interval, auto when OPENROUTER_API_KEY set)',
    defaultValue: true,
    category: 'worker',
  },
  MAINTENANCE_MODE: {
    name: 'Maintenance Mode',
    dbKey: 'maintenance_mode',
    description: 'Enable site-wide maintenance mode (503 for all non-admin requests)',
    defaultValue: false,
    category: 'maintenance',
  },
  MACRO_BLACKOUT: {
    name: 'Macro Blackout Guard',
    dbKey: 'enable_macro_blackout',
    description: 'Block new position entries during high-impact economic events',
    defaultValue: true,
    category: 'feature',
  },
  KYC_REQUIRED: {
    name: 'KYC Required',
    dbKey: 'kyc_required',
    description: 'Require KYC verification before trading activation',
    defaultValue: false,
    category: 'feature',
  },
  PROMO_STRATEGIST: {
    name: 'Promo Strategist',
    dbKey: 'enable_promo_strategist',
    description: 'AI-driven promotion decision engine (daily cron)',
    defaultValue: true,
    category: 'worker',
  },
  CMS_I18N_SYNC: {
    name: 'CMS i18n Auto-sync',
    dbKey: 'enable_cms_i18n_sync',
    description: 'Auto-translate CMS content to English (5min interval)',
    defaultValue: true,
    category: 'worker',
  },
} as const satisfies Record<string, FlagSpec>;

export type FlagName = keyof typeof FLAG_REGISTRY;

export async function isKnownFlagEnabled(flag: FlagName): Promise<boolean> {
  const spec = FLAG_REGISTRY[flag];
  return isFeatureEnabled(spec.dbKey, spec.defaultValue);
}

export function getAllFlagSpecs(): FlagSpec[] {
  return Object.values(FLAG_REGISTRY);
}

export function getFlagsByCategory(category: FlagSpec['category']): FlagSpec[] {
  return Object.values(FLAG_REGISTRY).filter((f) => f.category === category);
}
