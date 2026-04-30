'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe, Clock, Check } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * Region preferences popover — country + timezone + language selector.
 *
 * Mengapa dibutuhkan:
 *   - Audience kami Indonesia + Internasional (US/EU/SEA traders).
 *   - Geo-IP middleware sudah set NEXT_LOCALE cookie default berdasarkan
 *     CF-IPCountry; ini memberi user EXPLICIT override saat default salah.
 *   - Backend `Accept-Timezone` header dipakai oleh /api/forex/positions/stats
 *     dan reporting endpoints supaya bucket harian sesuai zona pengguna.
 *
 * Cookies yang ditulis:
 *   - NEXT_LOCALE  : 'id' | 'en' (sudah ada, di-write oleh middleware juga)
 *   - NEXT_REGION  : kode negara ISO-3166 alpha-2 (display preference)
 *   - NEXT_TZ      : IANA tz string (override Accept-Timezone default)
 *
 * Ketiga cookie persistent 365 hari, SameSite=Lax, secure di production.
 */

interface CountryOption {
  code: string;
  flag: string;
  nameId: string;
  nameEn: string;
  tz: string;
}

const COUNTRIES: CountryOption[] = [
  { code: 'ID', flag: '🇮🇩', nameId: 'Indonesia', nameEn: 'Indonesia', tz: 'Asia/Jakarta' },
  { code: 'SG', flag: '🇸🇬', nameId: 'Singapura', nameEn: 'Singapore', tz: 'Asia/Singapore' },
  { code: 'MY', flag: '🇲🇾', nameId: 'Malaysia', nameEn: 'Malaysia', tz: 'Asia/Kuala_Lumpur' },
  { code: 'JP', flag: '🇯🇵', nameId: 'Jepang', nameEn: 'Japan', tz: 'Asia/Tokyo' },
  { code: 'HK', flag: '🇭🇰', nameId: 'Hong Kong', nameEn: 'Hong Kong', tz: 'Asia/Hong_Kong' },
  { code: 'AE', flag: '🇦🇪', nameId: 'Uni Emirat Arab', nameEn: 'UAE', tz: 'Asia/Dubai' },
  { code: 'GB', flag: '🇬🇧', nameId: 'Inggris', nameEn: 'United Kingdom', tz: 'Europe/London' },
  { code: 'DE', flag: '🇩🇪', nameId: 'Jerman', nameEn: 'Germany', tz: 'Europe/Berlin' },
  { code: 'CH', flag: '🇨🇭', nameId: 'Swiss', nameEn: 'Switzerland', tz: 'Europe/Zurich' },
  { code: 'US', flag: '🇺🇸', nameId: 'Amerika Serikat', nameEn: 'United States', tz: 'America/New_York' },
  { code: 'CA', flag: '🇨🇦', nameId: 'Kanada', nameEn: 'Canada', tz: 'America/Toronto' },
  { code: 'AU', flag: '🇦🇺', nameId: 'Australia', nameEn: 'Australia', tz: 'Australia/Sydney' },
  { code: 'OTHER', flag: '🌐', nameId: 'Negara lain', nameEn: 'Other country', tz: 'UTC' },
];

const TIMEZONES = [
  { tz: 'Asia/Jakarta', labelId: 'WIB · Jakarta (UTC+7)', labelEn: 'WIB · Jakarta (UTC+7)' },
  { tz: 'Asia/Makassar', labelId: 'WITA · Makassar (UTC+8)', labelEn: 'WITA · Makassar (UTC+8)' },
  { tz: 'Asia/Jayapura', labelId: 'WIT · Jayapura (UTC+9)', labelEn: 'WIT · Jayapura (UTC+9)' },
  { tz: 'Asia/Singapore', labelId: 'Singapura (UTC+8)', labelEn: 'Singapore (UTC+8)' },
  { tz: 'Asia/Tokyo', labelId: 'Tokyo (UTC+9)', labelEn: 'Tokyo (UTC+9)' },
  { tz: 'Asia/Hong_Kong', labelId: 'Hong Kong (UTC+8)', labelEn: 'Hong Kong (UTC+8)' },
  { tz: 'Asia/Dubai', labelId: 'Dubai (UTC+4)', labelEn: 'Dubai (UTC+4)' },
  { tz: 'Europe/London', labelId: 'London (UTC+0/+1)', labelEn: 'London (UTC+0/+1)' },
  { tz: 'Europe/Berlin', labelId: 'Berlin (UTC+1/+2)', labelEn: 'Berlin (UTC+1/+2)' },
  { tz: 'America/New_York', labelId: 'New York (UTC-5/-4)', labelEn: 'New York (UTC-5/-4)' },
  { tz: 'America/Los_Angeles', labelId: 'Los Angeles (UTC-8/-7)', labelEn: 'Los Angeles (UTC-8/-7)' },
  { tz: 'UTC', labelId: 'UTC', labelEn: 'UTC' },
];

const LOCALES = [
  { code: 'id', labelId: 'Bahasa Indonesia', labelEn: 'Indonesian' },
  { code: 'en', labelId: 'Inggris', labelEn: 'English' },
];

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 86400_000).toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
}

function detectBrowserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  } catch {
    return 'Asia/Jakarta';
  }
}

interface RegionPreferencesProps {
  /** Render variant — "compact" untuk footer, "full" untuk dialog */
  variant?: 'compact' | 'full';
  className?: string;
}

export function RegionPreferences({ variant = 'compact', className }: RegionPreferencesProps) {
  const locale = useLocale() as 'id' | 'en';
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<string>('ID');
  const [timezone, setTimezone] = useState<string>('Asia/Jakarta');
  const [pendingLocale, setPendingLocale] = useState<'id' | 'en'>(locale);

  // Hydrate dari cookie on mount
  useEffect(() => {
    const c = readCookie('NEXT_REGION');
    const tz = readCookie('NEXT_TZ');
    if (c) setCountry(c);
    if (tz) {
      setTimezone(tz);
    } else {
      setTimezone(detectBrowserTz());
    }
  }, []);

  useEffect(() => {
    setPendingLocale(locale);
  }, [locale]);

  const currentCountry = useMemo(() => COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0], [country]);
  const currentTz = useMemo(() => TIMEZONES.find((t) => t.tz === timezone) ?? TIMEZONES[0], [timezone]);

  function handleSave() {
    writeCookie('NEXT_REGION', country);
    writeCookie('NEXT_TZ', timezone);
    if (pendingLocale !== locale) {
      writeCookie('NEXT_LOCALE', pendingLocale);
      // Reload page supaya next-intl pick up new locale
      const path = window.location.pathname.replace(/^\/(en|id)/, '');
      const target = pendingLocale === 'en' ? `/en${path || '/'}` : path || '/';
      window.location.href = target + window.location.search + window.location.hash;
      return;
    }
    setOpen(false);
    // Soft refresh untuk pages yang baca cookie server-side
    window.location.reload();
  }

  const triggerLabel =
    variant === 'compact'
      ? `${currentCountry.flag} ${locale === 'en' ? currentCountry.nameEn : currentCountry.nameId}`
      : `${currentCountry.flag} ${locale === 'en' ? currentCountry.nameEn : currentCountry.nameId} · ${locale === 'en' ? currentTz.labelEn : currentTz.labelId}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-md',
          'border border-border bg-card hover:bg-muted/60',
          'text-xs font-medium text-foreground/85',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        aria-label={locale === 'en' ? 'Region preferences' : 'Pengaturan wilayah'}
      >
        <Globe className="h-3.5 w-3.5" strokeWidth={2.25} />
        <span>{triggerLabel}</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={locale === 'en' ? 'Region preferences' : 'Pengaturan wilayah'}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-display text-xl text-foreground mb-1">
                {locale === 'en' ? 'Region preferences' : 'Pengaturan wilayah'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === 'en'
                  ? 'Set country, timezone, and language. Your trading dashboards will use these for time bucketing.'
                  : 'Atur negara, zona waktu, dan bahasa. Dashboard trading akan pakai ini untuk bucket waktu.'}
              </p>
            </div>

            <div className="p-5 space-y-5">
              {/* Language */}
              <Section
                icon={<span className="text-base leading-none">A·あ</span>}
                title={locale === 'en' ? 'Language' : 'Bahasa'}
              >
                <div className="grid grid-cols-2 gap-2">
                  {LOCALES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setPendingLocale(l.code as 'id' | 'en')}
                      className={cn(
                        'inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm',
                        'border transition-colors',
                        pendingLocale === l.code
                          ? 'border-primary bg-primary/[0.08] text-foreground'
                          : 'border-border hover:bg-muted/40 text-foreground/85',
                      )}
                    >
                      <span>{locale === 'en' ? l.labelEn : l.labelId}</span>
                      {pendingLocale === l.code ? <Check className="h-3.5 w-3.5 text-[hsl(var(--primary))]" strokeWidth={2.5} /> : null}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Country */}
              <Section
                icon={<Globe className="h-3.5 w-3.5" strokeWidth={2.25} />}
                title={locale === 'en' ? 'Country / Region' : 'Negara / Wilayah'}
              >
                <div className="grid grid-cols-1 gap-1 max-h-56 overflow-y-auto">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountry(c.code);
                        if (c.tz !== 'UTC') setTimezone(c.tz);
                      }}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm',
                        'transition-colors',
                        country === c.code
                          ? 'bg-primary/[0.08] text-foreground'
                          : 'hover:bg-muted/40 text-foreground/85',
                      )}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span aria-hidden className="text-base leading-none">{c.flag}</span>
                        <span className="truncate">{locale === 'en' ? c.nameEn : c.nameId}</span>
                      </span>
                      {country === c.code ? <Check className="h-3.5 w-3.5 text-[hsl(var(--primary))]" strokeWidth={2.5} /> : null}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Timezone */}
              <Section
                icon={<Clock className="h-3.5 w-3.5" strokeWidth={2.25} />}
                title={locale === 'en' ? 'Timezone' : 'Zona Waktu'}
              >
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={locale === 'en' ? 'Timezone' : 'Zona Waktu'}
                >
                  {TIMEZONES.map((t) => (
                    <option key={t.tz} value={t.tz}>
                      {locale === 'en' ? t.labelEn : t.labelId}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {locale === 'en'
                    ? `Backend Accept-Timezone header will be sent as "${timezone}".`
                    : `Header Accept-Timezone ke backend akan dikirim sebagai "${timezone}".`}
                </p>
              </Section>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-foreground/85 hover:bg-muted/60 transition-colors"
              >
                {locale === 'en' ? 'Cancel' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary px-4 py-2 text-sm font-medium rounded-md"
              >
                {locale === 'en' ? 'Save' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
