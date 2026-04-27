'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LayoutDashboard, KeyRound, Cpu, Activity, History, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CryptoTab {
  href: string;
  labelKey: 'tab_overview' | 'tab_connect' | 'tab_strategy' | 'tab_positions' | 'tab_trades' | 'tab_risk';
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const TABS: CryptoTab[] = [
  { href: '/portal/crypto', labelKey: 'tab_overview', icon: LayoutDashboard, exact: true },
  { href: '/portal/crypto/connect', labelKey: 'tab_connect', icon: KeyRound },
  { href: '/portal/crypto/strategy', labelKey: 'tab_strategy', icon: Cpu },
  { href: '/portal/crypto/positions', labelKey: 'tab_positions', icon: Activity },
  { href: '/portal/crypto/trades', labelKey: 'tab_trades', icon: History },
  { href: '/portal/crypto/risk', labelKey: 'tab_risk', icon: Shield },
];

export default function CryptoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('portal.crypto.layout');

  return (
    <div className="space-y-5">
      {/* Tab strip — horizontally scrollable on mobile */}
      <nav className="border-b border-white/10 -mx-4 lg:-mx-8 px-4 lg:px-8 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => {
            const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  active
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-white/20',
                )}
              >
                <tab.icon className="h-4 w-4" />
                {t(tab.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </div>
  );
}
