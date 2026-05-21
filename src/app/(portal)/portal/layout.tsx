'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  History,
  BarChart3,
  Radio,
  FileText,
  User,
  LogOut,
  ScrollText,
  BookOpen,
  Server,
  Zap,
  Bitcoin,
  IdCard,
  Activity,
  Cpu,
  Shield,
  KeyRound,
  Bell,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveSidebar } from '@/components/layout/responsive-sidebar';
import { BrandLogo } from '@/components/layout/brand-logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { KillSwitchBanner } from '@/components/portal/kill-switch-banner';
import { NotificationBellCount } from '@/components/portal/notification-bell-count';
import { KycAdvisoryBanner } from '@/components/portal/kyc-advisory-banner';
import { NotificationDispatcher } from '@/components/portal/notification-dispatcher';

interface NavItem {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  /** Optional badge slug — kalau set, render badge component sesuai slug. */
  badge?: 'notifications';
}

interface NavSection {
  labelKey: string | null;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: null,
    items: [
      { href: '/portal', labelKey: 'nav_dashboard', icon: LayoutDashboard },
      { href: '/portal/notifications', labelKey: 'nav_notifications', icon: Bell, badge: 'notifications' },
      { href: '/portal/features', labelKey: 'nav_features', icon: Sparkles },
    ],
  },
  {
    labelKey: 'nav_section_forex',
    items: [
      { href: '/portal/signals', labelKey: 'nav_my_signals', icon: Zap },
      { href: '/portal/positions', labelKey: 'nav_open_positions', icon: TrendingUp },
      { href: '/portal/history', labelKey: 'nav_trade_history', icon: History },
      { href: '/portal/performance', labelKey: 'nav_performance', icon: BarChart3 },
      { href: '/portal/market', labelKey: 'nav_market_scanner', icon: Radio },
      { href: '/portal/signal-audit', labelKey: 'nav_signal_audit', icon: ScrollText },
      { href: '/portal/pair-briefs', labelKey: 'nav_pair_briefs', icon: BookOpen },
      { href: '/portal/reports', labelKey: 'nav_reports', icon: FileText },
      { href: '/portal/my-vps', labelKey: 'nav_my_vps', icon: Server },
    ],
  },
  {
    labelKey: 'nav_section_crypto',
    items: [
      { href: '/portal/crypto', labelKey: 'nav_crypto_overview', icon: Bitcoin },
      { href: '/portal/crypto/connect', labelKey: 'nav_crypto_connect', icon: KeyRound },
      { href: '/portal/crypto/strategy', labelKey: 'nav_crypto_strategy', icon: Cpu },
      { href: '/portal/crypto/positions', labelKey: 'nav_crypto_positions', icon: Activity },
      { href: '/portal/crypto/trades', labelKey: 'nav_crypto_trades', icon: History },
      { href: '/portal/crypto/risk', labelKey: 'nav_crypto_risk', icon: Shield },
    ],
  },
  {
    labelKey: 'nav_section_account',
    items: [
      { href: '/portal/billing/upgrade', labelKey: 'nav_upgrade', icon: CreditCard },
      { href: '/portal/kyc', labelKey: 'nav_kyc', icon: IdCard },
      { href: '/portal/account', labelKey: 'nav_account', icon: User },
    ],
  },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortalLayoutInner>{children}</PortalLayoutInner>
    </AuthProvider>
  );
}

function PortalLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const t = useTranslations('portal.shared');

  return (
    <div className="min-h-screen flex">
      <ResponsiveSidebar>
        {/* Brand header */}
        <div className="px-5 py-6 border-b border-white/10">
          <Link href="/portal" className="flex items-center gap-2">
            <BrandLogo height={26} priority alt={t('logo_alt')} />
          </Link>
          <p className="text-[11px] text-muted-foreground mt-2 font-mono uppercase tracking-wider">{t('client_portal_label')}</p>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label={t('navigation_aria')}>
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx} className={cn(idx > 0 && 'mt-5')}>
              {section.labelKey && (
                <div className="px-3 mb-1.5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground/60 font-semibold">
                  {t(section.labelKey)}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  // Active state semantics:
                  //   - /portal: exact-match only (parent dashboard tidak di-claim child pages)
                  //   - Parent item dengan child item sibling lebih spesifik (mis. /portal/crypto
                  //     vs /portal/crypto/connect): exact-match only — child item own their state.
                  //     Tanpa fix ini, BOTH overview + child link active simultaneously (double active).
                  //   - Item tanpa child sibling: prefix match boleh — child route (mis.
                  //     /portal/my-vps/settings) menyala-kan parent nav item.
                  const hasMoreSpecificSibling = section.items.some(
                    (other) => other.href !== item.href && other.href.startsWith(item.href + '/'),
                  );
                  const exactOnly = item.href === '/portal' || hasMoreSpecificSibling;
                  const isActive = exactOnly
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive
                          ? 'bg-amber-500/10 text-amber-300 font-medium border-l-2 border-amber-400 -ml-[2px] pl-[10px]'
                          : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t(item.labelKey)}</span>
                      {item.badge === 'notifications' && <NotificationBellCount />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          {/* Locale + theme — quick toggles. */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2.5 text-sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </ResponsiveSidebar>

      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-4">
          <KillSwitchBanner />
          <KycAdvisoryBanner />
          {children}
        </div>
      </main>
      {/* No-render dispatcher — subscribes ke notification log + push toast
          + auto mark-read. Mount sekali per portal session. */}
      <NotificationDispatcher />
    </div>
  );
}
