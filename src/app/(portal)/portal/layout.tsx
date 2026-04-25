'use client';

import Link from 'next/link';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveSidebar } from '@/components/layout/responsive-sidebar';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';

const navItems = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/signals', label: 'My Signals', icon: Zap },
  { href: '/portal/positions', label: 'Open Positions', icon: TrendingUp },
  { href: '/portal/history', label: 'Trade History', icon: History },
  { href: '/portal/performance', label: 'Performance', icon: BarChart3 },
  { href: '/portal/market', label: 'Market Scanner', icon: Radio },
  { href: '/portal/signal-audit', label: 'Signal Audit', icon: ScrollText },
  { href: '/portal/pair-briefs', label: 'Pair Briefs', icon: BookOpen },
  { href: '/portal/reports', label: 'Reports', icon: FileText },
  { href: '/portal/my-vps', label: 'VPS Saya', icon: Server },
  { href: '/portal/account', label: 'Account', icon: User },
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
      {/* Sidebar */}
      <ResponsiveSidebar>
        <div className="p-6 border-b">
          <h1 className="text-lg font-bold text-foreground">BabahAlgo Portal</h1>
          <p className="text-xs text-muted-foreground">Client Dashboard</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/portal' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </ResponsiveSidebar>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
