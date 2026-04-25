'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, KeyRound, Cpu, Activity, History, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/portal/crypto', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/portal/crypto/connect', label: 'Connect', icon: KeyRound },
  { href: '/portal/crypto/strategy', label: 'Strategy', icon: Cpu },
  { href: '/portal/crypto/positions', label: 'Positions', icon: Activity },
  { href: '/portal/crypto/trades', label: 'Trades', icon: History },
  { href: '/portal/crypto/risk', label: 'Risk', icon: Shield },
];

export default function CryptoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </div>
  );
}
