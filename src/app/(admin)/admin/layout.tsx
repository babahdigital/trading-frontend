'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  KeyRound,
  Server,
  ServerCog,
  Users,
  UserCheck,
  ScrollText,
  Zap,
  Settings,
  LogOut,
  FileText,
  DollarSign,
  HelpCircle,
  Image,
  MessageSquare,
  Star,
  Globe,
  Inbox,
  BookOpen,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveSidebar } from '@/components/layout/responsive-sidebar';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/customers', label: 'Customers', icon: UserCheck },
  { href: '/admin/vps-fleet', label: 'VPS Fleet', icon: ServerCog },
  { href: '/admin/licenses', label: 'Licenses', icon: KeyRound },
  { href: '/admin/vps', label: 'VPS Instances', icon: Server },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/kill-switch', label: 'Kill Switch', icon: Zap },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const cmsNavItems = [
  { href: '/admin/cms/landing', label: 'Landing Page', icon: FileText },
  { href: '/admin/cms/pricing', label: 'Pricing', icon: DollarSign },
  { href: '/admin/cms/faq', label: 'FAQ', icon: HelpCircle },
  { href: '/admin/cms/banners', label: 'Banners', icon: Image },
  { href: '/admin/cms/popups', label: 'Popups', icon: MessageSquare },
  { href: '/admin/cms/testimonials', label: 'Testimonials', icon: Star },
  { href: '/admin/cms/seo', label: 'SEO / Meta', icon: Globe },
  { href: '/admin/cms/pages', label: 'Page Content', icon: Layers },
  { href: '/admin/cms/articles', label: 'Articles', icon: BookOpen },
  { href: '/admin/cms/blog-topics', label: 'Blog Topics (AI)', icon: Sparkles },
  { href: '/admin/cms/site-settings', label: 'Site Settings', icon: Settings },
  { href: '/admin/cms/changelog', label: 'Changelog', icon: ScrollText },
  { href: '/admin/cms/inquiries', label: 'Inquiries', icon: Inbox },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthProvider>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <ResponsiveSidebar>
        <div className="p-6 border-b">
          <h1 className="text-lg font-bold text-foreground">BabahAlgo Admin</h1>
          <p className="text-xs text-muted-foreground">Management Platform</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
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

          <div className="pt-4 pb-2">
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Konten
            </span>
          </div>
          {cmsNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
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
