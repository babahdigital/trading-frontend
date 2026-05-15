/**
 * Company settings — centralized info editable di admin.
 *
 * Dipakai di:
 *   - Footer (nama, alamat, telpon, email, social links)
 *   - Halaman /contact
 *   - Halaman /legal/* (compliance email, alamat resmi)
 *   - Email templates (sender footer, contact info)
 *   - SEO meta + structured data
 *
 * Storage: SiteSetting key-value dengan prefix "company.*". Plaintext
 * (bukan secret), aman di publik kalau perlu.
 *
 * Cache: in-memory 60s — admin update reflect dalam ~1 menit di public site.
 */
import { prisma } from '@/lib/db/prisma';

export interface CompanySettings {
  name: string;
  legalEntity: string;
  tagline: string;
  taglineEn: string;
  logoUrl: string;
  logoDarkUrl: string;
  /** Alamat fisik kantor */
  address: string;
  /** Telpon utama (display, sudah formatted) */
  phone: string;
  /** WhatsApp click-to-chat (E.164 digits-no-plus untuk wa.me) */
  whatsappDigits: string;
  /** Email umum customer-facing */
  emailGeneral: string;
  /** Email compliance / legal */
  emailCompliance: string;
  /** Email support */
  emailSupport: string;
  /** Country code 2-letter (ID, US, dst) */
  country: string;
  /** Tahun pendirian — untuk copyright footer */
  foundedYear: string;
  /** Social links */
  twitterUrl: string;
  linkedinUrl: string;
  telegramUrl: string;
  instagramUrl: string;
  /** Refund window untuk first-time subscriber (hari) — 0 = no refund */
  refundPolicyDays: number;
}

export const COMPANY_DEFAULTS: CompanySettings = {
  name: 'BabahAlgo',
  legalEntity: 'CV Babah Digital',
  tagline: 'Inteligensi Otonom · Presisi Institusional',
  taglineEn: 'Autonomous Intelligence · Institutional Precision',
  logoUrl: '/logo/babahalgo-header-light.png',
  logoDarkUrl: '/logo/babahalgo-header-dark.png',
  address: 'Indonesia',
  phone: '',
  whatsappDigits: '',
  emailGeneral: 'hello@babahalgo.com',
  emailCompliance: 'compliance@babahalgo.com',
  emailSupport: 'support@babahalgo.com',
  country: 'ID',
  foundedYear: '2024',
  twitterUrl: '',
  linkedinUrl: '',
  telegramUrl: 'https://t.me/babahalgo',
  instagramUrl: '',
  refundPolicyDays: 7,
};

const SETTING_KEYS = [
  'company.name',
  'company.legal_entity',
  'company.tagline',
  'company.tagline_en',
  'company.logo_url',
  'company.logo_dark_url',
  'company.address',
  'company.phone',
  'company.whatsapp_digits',
  'company.email_general',
  'company.email_compliance',
  'company.email_support',
  'company.country',
  'company.founded_year',
  'company.twitter_url',
  'company.linkedin_url',
  'company.telegram_url',
  'company.instagram_url',
  'company.refund_policy_days',
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

const KEY_TO_FIELD: Record<SettingKey, keyof CompanySettings> = {
  'company.name': 'name',
  'company.legal_entity': 'legalEntity',
  'company.tagline': 'tagline',
  'company.tagline_en': 'taglineEn',
  'company.logo_url': 'logoUrl',
  'company.logo_dark_url': 'logoDarkUrl',
  'company.address': 'address',
  'company.phone': 'phone',
  'company.whatsapp_digits': 'whatsappDigits',
  'company.email_general': 'emailGeneral',
  'company.email_compliance': 'emailCompliance',
  'company.email_support': 'emailSupport',
  'company.country': 'country',
  'company.founded_year': 'foundedYear',
  'company.twitter_url': 'twitterUrl',
  'company.linkedin_url': 'linkedinUrl',
  'company.telegram_url': 'telegramUrl',
  'company.instagram_url': 'instagramUrl',
  'company.refund_policy_days': 'refundPolicyDays',
};

const FIELD_TO_KEY: Record<keyof CompanySettings, SettingKey> = Object.fromEntries(
  Object.entries(KEY_TO_FIELD).map(([k, v]) => [v, k as SettingKey]),
) as Record<keyof CompanySettings, SettingKey>;

let cache: { value: CompanySettings; expiry: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getCompanySettings(opts: { skipCache?: boolean } = {}): Promise<CompanySettings> {
  if (!opts.skipCache && cache && Date.now() < cache.expiry) return cache.value;

  const rows = await prisma.siteSetting
    .findMany({ where: { key: { in: [...SETTING_KEYS] } } })
    .catch(() => []);

  const settings: CompanySettings = { ...COMPANY_DEFAULTS };
  for (const r of rows) {
    const field = KEY_TO_FIELD[r.key as SettingKey];
    if (field && r.value) {
      // refundPolicyDays parse number — sisanya string
      if (field === 'refundPolicyDays') {
        const n = parseInt(r.value, 10);
        if (Number.isFinite(n) && n >= 0) settings.refundPolicyDays = n;
      } else {
        (settings as unknown as Record<string, string>)[field] = r.value;
      }
    }
  }

  cache = { value: settings, expiry: Date.now() + CACHE_TTL_MS };
  return settings;
}

export function invalidateCompanyCache() {
  cache = null;
}

export function fieldToSettingKey(field: keyof CompanySettings): string {
  return FIELD_TO_KEY[field];
}

export function getSettingKeys(): string[] {
  return [...SETTING_KEYS];
}
