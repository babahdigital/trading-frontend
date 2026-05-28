'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EquityCurve } from '@/components/charts/equity-curve';
import { PnlBarChart } from '@/components/charts/pnl-bar-chart';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';
import { DiscoveryBanner } from '@/components/portal/discovery-banner';
import { ShopProductsSection } from '@/components/portal/shop-products-section';
import { OnboardingChecklist } from '@/components/portal/onboarding-checklist';
import { VerifyEmailBanner } from '@/components/portal/verify-email-banner';
import { SubscriptionRequiredEmpty } from '@/components/portal/subscription-required-empty';
import { SubscriptionExpiryBanner } from '@/components/portal/subscription-expiry-banner';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard, StatCardGrid } from '@/components/admin/stat-card';
import { EmptyState } from '@/components/admin/empty-state';
import { Icon } from '@/components/ui/icon';
import { Activity, TrendingUp, Wallet, ListChecks, Bot, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency, formatPercent, formatDuration } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';

interface StatusData {
  bot_status?: string;
  today_pnl?: number;
  open_trades?: number;
  equity?: number;
  license_status?: string;
  license_expiry?: string;
  wins_today?: number;
  losses_today?: number;
  active_pairs?: number;
  equity_change_pct?: number;
  floating_pnl?: number;
  ai_state_by_pair?: Record<string, {
    runtime_status_label?: string;
    pair?: string;
    updated_seconds_ago?: number;
  }>;
  open_positions?: {
    symbol: string;
    direction: string;
    pnl_usd: number;
    duration_seconds: number;
    status?: string;
  }[];
}

export default function PortalDashboard() {
  const t = useTranslations('portal.dashboard');
  const tShared = useTranslations('portal.shared');
  const locale = useLocale() as Locale;
  const { getAuthHeaders } = useAuth();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const [weeklyPnl, setWeeklyPnl] = useState<{ date: string; pnl: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [equityPeriod, setEquityPeriod] = useState('30D');

  const [emailVerified, setEmailVerified] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState<{
    tier: string;
    expiresAt: string;
    daysRemaining: number;
    autoRenew: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const cached = sessionStorage.getItem('user');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!cancelled) {
            setUserName(parsed.name || parsed.email || '');
            // Cache hanya KONFIRMASI verified=true, tidak override default
            // ke false (Pak Abdullah audit 2026-05-22 — stale cache dengan
            // emailVerifiedAt=null bikin banner flash padahal sudah verified).
            // Unverified state hanya bisa diset dari /api/auth/me fresh response.
            if (parsed.emailVerifiedAt) {
              setEmailVerified(true);
            }
          }
        }
      } catch { /* empty */ }
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.user) {
          setUserName(data.user.name || data.user.email || '');
          // /api/auth/me adalah source of truth — set verified state
          // langsung dari API response (tidak default ke true).
          setEmailVerified(!!data.user.emailVerifiedAt);
          if (data.activeSubscription) setActiveSubscription(data.activeSubscription);
          try { sessionStorage.setItem('user', JSON.stringify(data.user)); } catch { /* empty */ }
        }
      } catch { /* network glitch */ }
    }
    loadUser();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let active = true;
    // Track whether we already silenced this fetch — kalau user belum subscribe,
    // /api/client/status balikin 403 (no_active_subscription by design).
    // Setelah satu kali silent acknowledge, jangan terus-menerus polling supaya
    // tidak banjir 403 di console.
    let silenced = false;
    async function fetchStatus() {
      try {
        const res = await fetch('/api/client/status', { headers: getAuthHeaders(), credentials: 'same-origin' });
        if (res.status === 403) {
          // No active subscription → portal dashboard empty + ShopProductsSection
          // surface upsell. Bukan error UX-visible.
          silenced = true;
          if (active) { setStatus(null); setError(''); setLoading(false); }
          return;
        }
        if (res.status === 401) {
          // Session expired — redirect ke /login untuk re-auth bersih.
          if (active) { setError(''); setLoading(false); }
          return;
        }
        if (!res.ok) throw new Error(t('fetch_status_failed'));
        const data = await res.json();
        if (active) { setStatus(data); setError(''); }
      } catch (err: unknown) {
        if (active && !silenced) setError(err instanceof Error ? err.message : tShared('connection_error'));
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchStatus();
    const interval = setInterval(() => {
      if (!silenced) fetchStatus();
    }, 5000);
    return () => { active = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function fetchEquity() {
      try {
        const days = equityPeriod === '7D' ? 7 : equityPeriod === '90D' ? 90 : 30;
        const res = await fetch(`/api/client/equity?days=${days}`, { headers: getAuthHeaders(), credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.snapshots)) {
            setEquityData(data.snapshots.map((s: { timestamp: string; equity: number }) => ({
              time: s.timestamp?.split('T')[0] || s.timestamp,
              value: s.equity,
            })));
          }
        }
        // Silent for 403/401 — handled by primary status poll + ShopProductsSection upsell.
      } catch { /* handled */ }
    }
    fetchEquity();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equityPeriod]);

  useEffect(() => {
    async function fetchWeeklyPnl() {
      try {
        const res = await fetch('/api/client/reports', { headers: getAuthHeaders(), credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          if (data.daily_pnl && Array.isArray(data.daily_pnl)) {
            setWeeklyPnl(data.daily_pnl.slice(-7));
          }
        }
        // Silent for 403/401 — same rationale as equity fetch.
      } catch { /* handled */ }
    }
    fetchWeeklyPnl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function botStatusTone(s?: string): 'success' | 'danger' | 'warning' | 'default' {
    if (!s) return 'default';
    const lower = s.toLowerCase();
    if (lower === 'active' || lower === 'running') return 'success';
    if (lower === 'error') return 'danger';
    return 'warning';
  }

  function licenseCountdown() {
    if (!status?.license_expiry) return null;
    // Date.now() di-evaluate per render — di-refresh otomatis lewat polling parent state.
    // eslint-disable-next-line react-hooks/purity
    const diff = new Date(status.license_expiry).getTime() - Date.now();
    if (diff <= 0) return t('license_expired');
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return t('license_days_left', { days });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} />
        <StatCardGrid columns={4}>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </StatCardGrid>
        <SkeletonChart />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  const positions = status?.open_positions || [];
  const aiStates = status?.ai_state_by_pair ? Object.entries(status.ai_state_by_pair) : [];
  const todayPnl = status?.today_pnl;
  const floatingPnl = status?.floating_pnl;
  const equity = status?.equity;
  const equityChangePct = status?.equity_change_pct;

  // Equity di backend disimpan dalam USD (master broker Exness USD).
  // Untuk locale id, kita tampilkan IDR equivalent via Intl.NumberFormat — backend
  // tidak konversi, FE display saja sehingga audit trail tetap USD-native.
  // Pertimbangan: kurs realtime butuh provider — untuk MVP tampilkan USD apa adanya
  // di kedua locale (institutional convention forex = USD universal).
  const displayCurrency = 'USD';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={userName ? t('welcome', { name: userName }) : undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              status?.license_status === 'active'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
            )}>
              <span className={cn(
                'inline-block h-1.5 w-1.5 rounded-full',
                status?.license_status === 'active' ? 'bg-emerald-500' : 'bg-amber-500',
              )} />
              {t('license_label')} {status?.license_status === 'active' ? t('license_active') : status?.license_status || t('license_unknown')}
            </span>
            {licenseCountdown() && <span className="text-xs text-muted-foreground">{licenseCountdown()}</span>}
          </div>
        }
      />

      {error && (
        <div role="alert" className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <SubscriptionExpiryBanner subscription={activeSubscription} />
      <VerifyEmailBanner initialVerified={emailVerified} />
      <OnboardingChecklist locale={locale === 'en' ? 'en' : 'id'} />
      <DiscoveryBanner />

      {/* No active subscription → prominent CTA before shop section
          (Pak Abdullah audit 2026-05-22 — institusional UX, jelas user
          butuh subscribe untuk akses fitur premium). */}
      {!activeSubscription && (
        <SubscriptionRequiredEmpty
          feature="default"
          description={{
            id: 'Akun Anda aktif tapi belum punya subscription. Pilih paket di bawah untuk unlock fitur trading live, analytics performance, audit signal, kontrol risk, dan notifikasi real-time.',
            en: 'Your account is active but has no subscription yet. Choose a plan below to unlock live trading, performance analytics, signal audit, risk controls, and real-time notifications.',
          }}
        />
      )}

      <ShopProductsSection />

      {/* KPI Row */}
      <StatCardGrid columns={4}>
        <StatCard
          label={t('kpi_bot_status')}
          value={<span className="capitalize">{status?.bot_status || '-'}</span>}
          sub={`${status?.active_pairs ?? '—'} ${t('kpi_pairs_suffix')}`}
          icon={Activity}
          iconTone={botStatusTone(status?.bot_status)}
        />
        <StatCard
          label={t('kpi_equity')}
          value={equity != null ? formatCurrency(equity, displayCurrency, locale) : '-'}
          sub={equityChangePct != null
            ? <span className={cn('inline-flex items-center gap-1', equityChangePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                <Icon icon={equityChangePct >= 0 ? ArrowUp : ArrowDown} size="xs" />
                {formatPercent(equityChangePct, locale, { sign: true })}
              </span>
            : undefined}
          icon={Wallet}
          iconTone="accent"
        />
        <StatCard
          label={t('kpi_today_pnl')}
          value={
            <span className={cn(
              todayPnl != null ? (todayPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : '',
            )}>
              {todayPnl != null ? `${todayPnl >= 0 ? '+' : ''}${formatCurrency(Math.abs(todayPnl), displayCurrency, locale)}` : '-'}
            </span>
          }
          sub={(status?.wins_today != null || status?.losses_today != null)
            ? t('kpi_wl_short', { wins: status?.wins_today ?? 0, losses: status?.losses_today ?? 0 })
            : undefined}
          icon={TrendingUp}
          iconTone={todayPnl != null ? (todayPnl >= 0 ? 'success' : 'danger') : 'default'}
        />
        <StatCard
          label={t('kpi_open_trades')}
          value={status?.open_trades ?? positions.length}
          sub={
            <span className={cn(
              'font-mono',
              (floatingPnl ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
            )}>
              {floatingPnl != null
                ? `${floatingPnl >= 0 ? '+' : ''}${formatCurrency(Math.abs(floatingPnl), displayCurrency, locale)}`
                : '-'}
            </span>
          }
          icon={ListChecks}
          iconTone={(floatingPnl ?? 0) >= 0 ? 'success' : 'danger'}
        />
      </StatCardGrid>

      {/* Equity Curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('equity_curve_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {equityData.length > 0 ? (
            <EquityCurve
              data={equityData}
              height={320}
              periods={['7D', '30D', '90D']}
              activePeriod={equityPeriod}
              onPeriodChange={setEquityPeriod}
            />
          ) : (
            <EmptyState
              variant="inline"
              icon={Activity}
              title={t('equity_empty')}
              size="sm"
            />
          )}
        </CardContent>
      </Card>

      {/* Open Positions + Bot Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">{t('open_positions_title')}</CardTitle>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('polling_3s')}
            </span>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <EmptyState
                variant="inline"
                icon={TrendingUp}
                title={t('open_positions_empty')}
                size="sm"
              />
            ) : (
              <ul className="space-y-2">
                {positions.map((pos, i) => (
                  <li key={i} className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors',
                    pos.pnl_usd >= 0 ? 'border-emerald-500/30 hover:bg-emerald-500/5' : 'border-rose-500/30 hover:bg-rose-500/5',
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-semibold text-sm">{pos.symbol}</span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded font-medium',
                        pos.direction === 'BUY'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                      )}>{pos.direction}</span>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        'font-mono font-semibold text-sm',
                        pos.pnl_usd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                      )}>
                        {pos.pnl_usd >= 0 ? '+' : ''}{formatCurrency(Math.abs(pos.pnl_usd || 0), displayCurrency, locale)}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDuration(pos.duration_seconds || 0)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('bot_activity_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {aiStates.length === 0 ? (
              <EmptyState
                variant="inline"
                icon={Bot}
                title={t('bot_activity_empty')}
                size="sm"
              />
            ) : (
              <ul className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {aiStates.map(([pair, state]) => (
                  <li key={pair} className="flex items-center gap-3 p-2 text-sm rounded-md hover:bg-muted/40 transition-colors">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 flex-shrink-0 animate-pulse" />
                    <div className="min-w-0 flex-1">
                      <span className="font-mono font-semibold">{pair}</span>
                      <span className="text-muted-foreground ml-2 truncate">
                        {state.runtime_status_label || t('bot_default_status')}
                      </span>
                    </div>
                    {state.updated_seconds_ago !== undefined && (
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{state.updated_seconds_ago}s</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly PnL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('weekly_pnl_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyPnl.length > 0 ? (
            <PnlBarChart data={weeklyPnl} height={160} />
          ) : (
            <EmptyState
              variant="inline"
              icon={TrendingUp}
              title={t('weekly_pnl_empty')}
              size="sm"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
