'use client';

/**
 * Admin sidebar — conventional collapsible nav menggantikan mega-menu top-nav.
 *
 * Desktop (lg+): persistent left sidebar dengan grup collapsible. Brand di
 * top, identity di bottom. Active route auto-expand parent group.
 *
 * Mobile (<lg): drawer overlay (portal-based) yang dibuka via topbar burger.
 *
 * Why sidebar bukan mega-menu top-nav: Operations console punya 30+ link
 * tersebar di 5 grup; mega-menu CMS dengan 18 item terasa terlalu padat,
 * konvensional sidebar (Linear/Stripe/Vercel style) lebih scalable + scan-friendly.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Building2, ChevronDown, ChevronRight, Menu, X, Cog, MonitorSmartphone, Activity,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavItem = { href: string; label: string; icon: LucideIcon; desc?: string };
type NavGroup = {
  label: string;
  key: string;
  icon: LucideIcon;
  /** Default expand di desktop saat route ada di grup ini. */
  defaultExpanded?: boolean;
  items: NavItem[];
};

// Grup nav admin — semantic split. Operations (most-used) di atas, Content (CMS)
// dipecah jadi 3 sub-grup yang lebih intuitif (sebelumnya mega-menu 18 item
// dalam 4-col grid — terlalu padat).
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    key: 'ops',
    icon: Activity,
    defaultExpanded: true,
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/customers', label: 'Customers', icon: UserCheck },
      { href: '/admin/licenses', label: 'Licenses', icon: KeyRound },
      { href: '/admin/kill-switch', label: 'Kill Switch', icon: Zap },
    ],
  },
  {
    label: 'Infrastructure',
    key: 'infra',
    icon: ServerCog,
    items: [
      { href: '/admin/vps-fleet', label: 'VPS Fleet', icon: ServerCog },
      { href: '/admin/vps', label: 'VPS Instances', icon: Server },
      { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
      { href: '/admin/analytics', label: 'Analytics & PMF', icon: Activity },
    ],
  },
  {
    label: 'People',
    key: 'people',
    icon: Users,
    items: [
      { href: '/admin/team', label: 'Tim & RBAC', icon: Crown },
      { href: '/admin/users', label: 'Customer Users', icon: Users },
      { href: '/admin/profile', label: 'Akun Saya', icon: User },
    ],
  },
  {
    label: 'Marketing CMS',
    key: 'cms-marketing',
    icon: Layers,
    items: [
      { href: '/admin/cms/landing', label: 'Landing Page', icon: FileText },
      { href: '/admin/cms/pricing', label: 'Pricing', icon: DollarSign },
      { href: '/admin/cms/banners', label: 'Banners', icon: ImageIcon },
      { href: '/admin/cms/popups', label: 'Popups', icon: MessageSquare },
      { href: '/admin/cms/testimonials', label: 'Testimonials', icon: Star },
      { href: '/admin/cms/seo', label: 'SEO / Meta', icon: Globe },
      { href: '/admin/cms/pages', label: 'Page Content', icon: Layers },
    ],
  },
  {
    label: 'Content Studio',
    key: 'cms-content',
    icon: BookOpen,
    items: [
      { href: '/admin/cms/articles', label: 'Articles', icon: BookOpen },
      { href: '/admin/cms/blog-topics', label: 'Blog Topics (AI)', icon: Sparkles },
      { href: '/admin/cms/faq', label: 'FAQ', icon: HelpCircle },
      { href: '/admin/cms/changelog', label: 'Changelog', icon: ScrollText },
    ],
  },
  {
    label: 'Inbox & Leads',
    key: 'inbox',
    icon: Inbox,
    items: [
      { href: '/admin/cms/inquiries', label: 'Inquiries', icon: Inbox },
      { href: '/admin/cms/chat-leads', label: 'Chat Leads', icon: MessageSquare },
      { href: '/admin/cms/subscribers', label: 'Subscribers', icon: Mail },
    ],
  },
  {
    label: 'Configuration',
    key: 'config',
    icon: Settings,
    items: [
      { href: '/admin/cms/company-settings', label: 'Company', icon: Building2 },
      { href: '/admin/cms/site-settings', label: 'Site Settings', icon: Cog },
      { href: '/admin/cms/email-settings', label: 'Email (Brevo)', icon: Mail },
      { href: '/admin/cms/email-templates', label: 'Email Templates', icon: FileText },
      { href: '/admin/settings', label: 'Platform', icon: Settings },
    ],
  },
];

interface AdminMe {
  email?: string;
  name?: string | null;
  role?: string;
}

const COLLAPSE_STORAGE_KEY = 'babahalgo.admin.sidebar.collapsed';

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<AdminMe | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (stored === 'true') setCollapsed(true);
    } catch {
      /* localStorage disabled */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setMe(data.user || data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Esc closes mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // Body scroll lock saat mobile drawer open
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

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <>
      {/* Mobile topbar — burger + brand */}
      <header className="lg:hidden sticky top-0 z-[70] flex h-14 items-center justify-between px-3 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="inline-flex items-center justify-center h-10 w-10 -ml-1 rounded-md text-foreground hover:bg-muted/60 active:scale-95 transition-all"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu admin"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MonitorSmartphone className="h-4.5 w-4.5" strokeWidth={2.25} />
            </span>
            <span className="text-sm font-semibold text-foreground">Admin Console</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </header>

      {/* Desktop sidebar — sticky left rail */}
      <aside
        className={cn(
          'hidden lg:flex fixed inset-y-0 left-0 z-[60] flex-col border-r border-border bg-card/40 backdrop-blur-md transition-[width] duration-200',
          collapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center h-16 border-b border-border', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
          {!collapsed ? (
            <>
              <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                  <MonitorSmartphone className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <div className="leading-tight min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">BabahAlgo</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin Console</div>
                </div>
              </Link>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Sembunyikan sidebar"
              >
                <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-primary text-primary-foreground hover:scale-105 transition-transform"
              aria-label="Buka sidebar"
              title="Buka sidebar"
            >
              <PanelLeftOpen className="h-4.5 w-4.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Scrollable nav */}
        <nav role="navigation" aria-label="Admin sections" className="flex-1 overflow-y-auto overscroll-contain px-2 py-4 space-y-3">
          {NAV_GROUPS.map((group) => (
            <SidebarGroup
              key={group.key}
              group={group}
              isActive={isActive}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Identity strip + logout */}
        <div className="shrink-0 border-t border-border p-3 space-y-2">
          {!collapsed && me?.email ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-semibold shrink-0">
                {(me.name || me.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-xs font-medium text-foreground truncate">{me.name || me.email}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{me.role || 'admin'}</span>
              </div>
            </div>
          ) : null}
          <div className={cn('flex items-center gap-1.5', collapsed ? 'flex-col' : 'flex-row')}>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className={cn(collapsed ? 'w-9 px-0' : 'flex-1 justify-start')}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className={cn('h-4 w-4', !collapsed && 'mr-2')} />
              {!collapsed && 'Logout'}
            </Button>
          </div>
        </div>
      </aside>

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
              userRole={me?.role}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function SidebarGroup({
  group,
  isActive,
  collapsed,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
  collapsed: boolean;
}) {
  const hasActiveItem = useMemo(() => group.items.some((i) => isActive(i.href)), [group.items, isActive]);
  const [expanded, setExpanded] = useState(group.defaultExpanded || hasActiveItem);

  // Auto-expand kalau active item ditemukan setelah render initial
  useEffect(() => {
    if (hasActiveItem) setExpanded(true);
  }, [hasActiveItem]);

  if (collapsed) {
    // Collapsed mode — render hanya item dengan icon (tooltip via title), tanpa group header
    return (
      <div className="space-y-1">
        {group.items.map((item) => {
          const ItemIcon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'flex items-center justify-center h-10 w-12 mx-auto rounded-md transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
            >
              <ItemIcon className="h-4.5 w-4.5" strokeWidth={2} />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors',
          'text-muted-foreground hover:text-foreground',
        )}
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-2">
          <group.icon className="h-3.5 w-3.5" strokeWidth={2} />
          {group.label}
        </span>
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {expanded ? (
        <div className="mt-1 space-y-0.5">
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-primary/15 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <ItemIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
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
  userRole,
}: {
  groups: NavGroup[];
  isActive: (href: string) => boolean;
  onClose: () => void;
  onLogout: () => void;
  userEmail?: string;
  userName?: string | null;
  userRole?: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Admin menu"
      className="lg:hidden fixed inset-0 z-[90] flex flex-col bg-background"
    >
      <div className="flex items-center justify-between h-14 px-3 sm:px-4 border-b border-border bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
            <MonitorSmartphone className="h-4.5 w-4.5" strokeWidth={2.25} />
          </span>
          <div className="leading-tight min-w-0">
            <div className="text-sm font-semibold text-foreground">BabahAlgo Admin</div>
            {(userName || userEmail) ? (
              <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{userName || userEmail}</div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center h-10 w-10 -mr-1 rounded-md text-foreground hover:bg-muted/60 active:scale-95 transition-all"
          aria-label="Tutup menu"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 space-y-1">
        {groups.map((group) => (
          <MobileGroup key={group.key} group={group} isActive={isActive} onClose={onClose} />
        ))}
      </div>

      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-3 sm:px-4 py-3 flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {userRole ? (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2">{userRole}</span>
        ) : null}
        <ThemeToggle />
        <Button variant="outline" size="sm" onClick={() => { onClose(); onLogout(); }} className="ml-auto">
          <LogOut className="h-4 w-4 mr-1.5" />
          Logout
        </Button>
      </div>
    </div>
  );
}

function MobileGroup({
  group,
  isActive,
  onClose,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
  onClose: () => void;
}) {
  const hasActiveItem = useMemo(() => group.items.some((i) => isActive(i.href)), [group.items, isActive]);
  const [expanded, setExpanded] = useState(group.defaultExpanded || hasActiveItem);

  useEffect(() => {
    if (hasActiveItem) setExpanded(true);
  }, [hasActiveItem]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted/40',
        )}
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-2">
          <group.icon className="h-3.5 w-3.5" strokeWidth={2} />
          {group.label}
        </span>
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {expanded ? (
        <div className="space-y-0.5 mt-0.5 mb-2">
          {group.items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-primary/15 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
