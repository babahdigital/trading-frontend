'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveSidebar } from '@/components/layout/responsive-sidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/portal/notifications', label: 'Notifikasi', icon: Bell },
      { href: '/portal/features', label: 'Fitur & Capabilities', icon: Sparkles },
    ],
  },
  {
    label: 'Forex',
    items: [
      { href: '/portal/signals', label: 'My Signals', icon: Zap },
      { href: '/portal/positions', label: 'Open Positions', icon: TrendingUp },
      { href: '/portal/history', label: 'Trade History', icon: History },
      { href: '/portal/performance', label: 'Performance', icon: BarChart3 },
      { href: '/portal/market', label: 'Market Scanner', icon: Radio },
      { href: '/portal/signal-audit', label: 'Signal Audit', icon: ScrollText },
      { href: '/portal/pair-briefs', label: 'Pair Briefs', icon: BookOpen },
      { href: '/portal/reports', label: 'Reports', icon: FileText },
      { href: '/portal/my-vps', label: 'VPS Saya', icon: Server },
    ],
  },
  {
    label: 'Crypto',
    items: [
      { href: '/portal/crypto', label: 'Overview', icon: Bitcoin },
      { href: '/portal/crypto/connect', label: 'Connect Binance', icon: KeyRound },
      { href: '/portal/crypto/strategy', label: 'Strategy', icon: Cpu },
      { href: '/portal/crypto/positions', label: 'Live Positions', icon: Activity },
      { href: '/portal/crypto/trades', label: 'Trade History', icon: History },
      { href: '/portal/crypto/risk', label: 'Risk Profile', icon: Shield },
    ],
  },
  {
    label: 'Akun',
    items: [
      { href: '/portal/kyc', label: 'Verifikasi (KYC)', icon: IdCard },
      { href: '/portal/account', label: 'Profil & Billing', icon: User },
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

  return (
    <div className="min-h-screen flex">
      <ResponsiveSidebar>
        {/* Brand header */}
        <div className="px-5 py-6 border-b border-white/10">
          <Link href="/portal" className="flex items-center gap-2">
            <Image
              src="/logo/babahalgo-horizontal-inverse.png"
              alt="BabahAlgo"
              width={120}
              height={24}
              className="h-6 w-auto hidden dark:block"
              priority
            />
            <Image
              src="/logo/babahalgo-horizontal-dual.png"
              alt="BabahAlgo"
              width={120}
              height={24}
              className="h-6 w-auto dark:hidden"
              priority
            />
          </Link>
          <p className="text-[11px] text-muted-foreground mt-2 font-mono uppercase tracking-wider">Client Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Portal navigation">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx} className={cn(idx > 0 && 'mt-5')}>
              {section.label && (
                <div className="px-3 mb-1.5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground/60 font-semibold">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = item.href === '/portal'
                    ? pathname === '/portal'
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
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 flex items-center gap-2">
          <Button variant="ghost" className="flex-1 justify-start gap-2.5 text-sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          <ThemeToggle />
        </div>
      </ResponsiveSidebar>

      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
