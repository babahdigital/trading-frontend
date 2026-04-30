'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/lib/auth/auth-context';
import {
  LayoutDashboard, KeyRound, Server, ServerCog, Users, UserCheck, ScrollText,
  Zap, Settings, LogOut, FileText, DollarSign, HelpCircle, Image as ImageIcon,
  MessageSquare, Mail, Star, Globe, Inbox, BookOpen, Layers, Sparkles, User, Crown,
  ChevronDown, Menu, X, Cog, MonitorSmartphone, Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavItem = { href: string; label: string; icon: LucideIcon; desc?: string };
type NavGroup = { label: string; key: string; icon: LucideIcon; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    key: 'ops',
    icon: Activity,
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, desc: 'KPI, equity curve, live positions' },
      { href: '/admin/customers', label: 'Customers', icon: UserCheck, desc: 'Subscriber lifecycle & support' },
      { href: '/admin/licenses', label: 'Licenses', icon: KeyRound, desc: 'License keys, expiry, renewals' },
      { href: '/admin/kill-switch', label: 'Kill Switch', icon: Zap, desc: 'Emergency stop & cooling resolve' },
    ],
  },
  {
    label: 'Infrastructure',
    key: 'infra',
    icon: ServerCog,
    items: [
      { href: '/admin/vps-fleet', label: 'VPS Fleet', icon: ServerCog, desc: 'Pool overview & deployments' },
      { href: '/admin/vps', label: 'VPS Instances', icon: Server, desc: 'Per-instance health & metrics' },
      { href: '/admin/audit', label: 'Audit Log', icon: ScrollText, desc: 'Tamper-evident operations log' },
    ],
  },
  {
    label: 'People',
    key: 'people',
    icon: Users,
    items: [
      { href: '/admin/team', label: 'Tim & RBAC', icon: Crown, desc: 'Super admin, admin, operator dengan permissions scoped' },
      { href: '/admin/users', label: 'Customer Users', icon: Users, desc: 'Daftar customer / portal user (CLIENT role)' },
      { href: '/admin/profile', label: 'Akun Saya', icon: User, desc: 'Edit profile & sign-in' },
    ],
  },
  {
    label: 'Content',
    key: 'cms',
    icon: Layers,
    items: [
      { href: '/admin/cms/landing', label: 'Landing Page', icon: FileText },
      { href: '/admin/cms/pricing', label: 'Pricing', icon: DollarSign },
      { href: '/admin/cms/faq', label: 'FAQ', icon: HelpCircle },
      { href: '/admin/cms/banners', label: 'Banners', icon: ImageIcon },
      { href: '/admin/cms/popups', label: 'Popups', icon: MessageSquare },
      { href: '/admin/cms/testimonials', label: 'Testimonials', icon: Star },
      { href: '/admin/cms/seo', label: 'SEO / Meta', icon: Globe },
      { href: '/admin/cms/pages', label: 'Page Content', icon: Layers },
      { href: '/admin/cms/articles', label: 'Articles', icon: BookOpen },
      { href: '/admin/cms/blog-topics', label: 'Blog Topics (AI)', icon: Sparkles },
      { href: '/admin/cms/site-settings', label: 'Site Settings', icon: Cog },
      { href: '/admin/cms/changelog', label: 'Changelog', icon: ScrollText },
      { href: '/admin/cms/inquiries', label: 'Inquiries', icon: Inbox },
      { href: '/admin/cms/chat-leads', label: 'Chat Leads', icon: MessageSquare },
      { href: '/admin/cms/subscribers', label: 'Subscribers', icon: Mail },
    ],
  },
  {
    label: 'System',
    key: 'system',
    icon: Settings,
    items: [
      { href: '/admin/settings', label: 'Settings', icon: Settings, desc: 'Platform configuration' },
    ],
  },
];

interface AdminMe {
  email?: string;
  name?: string | null;
  role?: string;
}

export function AdminTopNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<AdminMe | null>(null);

  useEffect(() => setMounted(true), []);

  // Fetch current admin user for the right-side identity strip
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setMe(data.user || data);
      })
      .catch(() => {
        /* anonymous */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on route change
  useEffect(() => {
    setOpenKey(null);
    setMobileOpen(false);
  }, [pathname]);

  // Esc closes everything
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenKey(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // iOS-safe scroll lock for mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

  const isActive = useCallback(
    (href: string) => pathname === href || (href !== '/admin' && pathname.startsWith(href)),
    [pathname],
  );

  const activeGroupKey = NAV_GROUPS.find((g) => g.items.some((i) => isActive(i.href)))?.key ?? null;

  return (
    <>
      <header
        className="sticky top-0 z-[80] bg-background/85 backdrop-blur-xl border-b border-border"
        onMouseLeave={() => setOpenKey(null)}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Brand */}
            <Link href="/admin" className="flex items-center gap-2.5 shrink-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <MonitorSmartphone className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div className="hidden md:block leading-tight">
                <div className="text-sm font-semibold text-foreground">BabahAlgo Admin</div>
                <div className="text-[11px] text-muted-foreground">Management Console</div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav
              role="navigation"
              aria-label="Admin sections"
              className="hidden lg:flex items-center gap-0.5"
            >
              {NAV_GROUPS.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setOpenKey(openKey === group.key ? null : group.key)}
                  onMouseEnter={() => setOpenKey(group.key)}
                  aria-expanded={openKey === group.key}
                  aria-haspopup="true"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeGroupKey === group.key
                      ? 'text-foreground bg-muted/60'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                  )}
                >
                  <group.icon className="h-4 w-4" strokeWidth={2} />
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform',
                      openKey === group.key ? 'rotate-180' : '',
                    )}
                    strokeWidth={2}
                  />
                </button>
              ))}
            </nav>

            {/* Right cluster */}
            <div className="flex items-center gap-1.5 shrink-0">
              {me?.email && (
                <div className="hidden xl:flex flex-col items-end leading-tight mr-1">
                  <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{me.name || me.email}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{me.role || 'admin'}</span>
                </div>
              )}
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={logout} className="hidden lg:inline-flex">
                <LogOut className="h-4 w-4 mr-1.5" />
                Logout
              </Button>

              {/* Mobile hamburger */}
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center p-2 -mr-2 rounded-md text-foreground hover:bg-muted/60 active:scale-95 transition-all"
                onClick={() => setMobileOpen(true)}
                aria-label="Buka menu admin"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop mega-menu drawer */}
        {openKey && (
          <div
            className="hidden lg:block absolute left-0 right-0 top-16 z-[79] bg-card border-b border-border shadow-lg animate-slide-down"
            role="menu"
            onMouseEnter={() => setOpenKey(openKey)}
          >
            <MegaMenuPanel
              group={NAV_GROUPS.find((g) => g.key === openKey)!}
              isActive={isActive}
              onClose={() => setOpenKey(null)}
            />
          </div>
        )}
      </header>

      {/* Backdrop click-away for desktop mega-menu */}
      {openKey && (
        <div
          className="hidden lg:block fixed inset-0 top-16 z-[78] bg-foreground/[0.03]"
          onClick={() => setOpenKey(null)}
          aria-hidden
        />
      )}

      {/* Mobile drawer (portal) */}
      {mounted && mobileOpen
        ? createPortal(
            <MobileAdminDrawer
              groups={NAV_GROUPS}
              isActive={isActive}
              onClose={() => setMobileOpen(false)}
              onLogout={logout}
              userEmail={me?.email}
              userName={me?.name}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function MegaMenuPanel({
  group,
  isActive,
  onClose,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
  onClose: () => void;
}) {
  // CMS group has many items — switch to 4-col compact list. Other groups use
  // 3-col with descriptions for editorial feel.
  const isCms = group.key === 'cms';
  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-7">
      <div className="flex items-center gap-2 mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <group.icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        {group.label}
      </div>
      <div className={cn('grid gap-x-6 gap-y-1.5', isCms ? 'grid-cols-4' : 'grid-cols-3')}>
        {group.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              'group flex items-start gap-3 px-3 py-2.5 -mx-3 rounded-md transition-all',
              isActive(item.href)
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors',
                isActive(item.href)
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border bg-muted/40 text-muted-foreground group-hover:border-primary/30 group-hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="flex flex-col leading-tight min-w-0">
              <span className={cn('text-sm font-medium', isActive(item.href) ? 'text-foreground' : 'text-foreground/90')}>
                {item.label}
              </span>
              {!isCms && item.desc ? (
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate">{item.desc}</span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobileAdminDrawer({
  groups,
  isActive,
  onClose,
  onLogout,
  userEmail,
  userName,
}: {
  groups: NavGroup[];
  isActive: (href: string) => boolean;
  onClose: () => void;
  onLogout: () => void;
  userEmail?: string;
  userName?: string | null;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Admin menu"
      className="lg:hidden fixed inset-0 z-[90] flex flex-col bg-background"
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-border bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MonitorSmartphone className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">BabahAlgo Admin</div>
            {(userName || userEmail) ? (
              <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{userName || userEmail}</div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center p-2 -mr-2 rounded-md text-foreground hover:bg-muted/60 active:scale-95 transition-all"
          aria-label="Tutup menu"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 space-y-7">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <group.icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 -mx-2 rounded-md text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-primary/15 text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-4 sm:px-6 py-4 flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <ThemeToggle />
        <Button variant="outline" size="sm" onClick={() => { onClose(); onLogout(); }} className="ml-auto">
          <LogOut className="h-4 w-4 mr-1.5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
