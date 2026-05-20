'use client';

/**
 * Admin sidebar — modern institutional console layout.
 *
 * Desktop (lg+): persistent left rail (260px expanded / 72px collapsed) dengan
 *   grup nav collapsible, brand di top, identity strip + theme/locale di bottom.
 * Mobile (<lg): topbar dengan burger → drawer overlay fullscreen.
 *
 * Modern polish (2026-05-21):
 *   - Brand mark dengan accent glow + subtle ring untuk premium feel.
 *   - Active item: gradient amber slab + left rail indicator + icon tone shift.
 *   - Hover: depth via bg-muted/50 (bukan ring), feel responsive.
 *   - Section group: spacing scale konsisten (token gaps), collapsible chevron rotate.
 *   - Collapsed mode: icon-only tooltip mode dengan Apple HIG 44px touch targets.
 *   - Identity strip: avatar bulat dengan initial, role chip.
 *
 * Render breakpoint: 4K+ tetap 260px (institutional consoles like Linear/Vercel
 *   stay narrow di 4K supaya canvas content lebar; sidebar tidak inflate).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Icon, IconCircle } from '@/components/ui/icon';
import { useAuth } from '@/lib/auth/auth-context';
import {
  LayoutDashboard, KeyRound, Server, ServerCog, Users, UserCheck, ScrollText,
  Zap, Settings, LogOut, FileText, DollarSign, HelpCircle, Image as ImageIcon,
  MessageSquare, Mail, Star, Globe, Inbox, BookOpen, Layers, Sparkles, User, Crown,
  Building2, ChevronDown, ChevronRight, Menu, X, Cog, MonitorSmartphone, Activity,
  PanelLeftClose, PanelLeftOpen, Search as SearchIcon,
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

// Flatten untuk command palette search
const ALL_NAV_ITEMS: Array<NavItem & { group: string }> = NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ ...i, group: g.label })),
);

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
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    // SSR hydration guard + restore collapsed pref dari localStorage (external storage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Close mobile drawer + palette on route change — sync UI state dengan pathname.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    setPaletteOpen(false);
  }, [pathname]);

  // Cmd/Ctrl+K opens command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        if (paletteOpen) setPaletteOpen(false);
        if (mobileOpen) setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [paletteOpen, mobileOpen]);

  // Body scroll lock saat mobile drawer / palette open
  useEffect(() => {
    if (!mobileOpen && !paletteOpen) return;
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
  }, [mobileOpen, paletteOpen]);

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
      {/* Mobile topbar — burger + brand + theme + search */}
      <header className="lg:hidden sticky top-0 z-[70] flex h-14 items-center justify-between px-3 sm:px-4 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="inline-flex items-center justify-center h-10 w-10 -ml-1 rounded-lg text-foreground hover:bg-muted active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu admin"
            aria-expanded={mobileOpen}
          >
            <Icon icon={Menu} size="lg" strokeWidth={2} />
          </button>
          <Link href="/admin" className="flex items-center gap-2" aria-label="Dashboard admin">
            <BrandMark size="sm" />
            <span className="text-sm font-semibold text-foreground">Admin</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Cari menu"
          >
            <Icon icon={SearchIcon} size="lg" strokeWidth={2} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Desktop sidebar — sticky left rail */}
      <aside
        className={cn(
          'hidden lg:flex fixed inset-y-0 left-0 z-[60] flex-col border-r border-border bg-card/60 backdrop-blur-xl transition-[width] duration-200',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        )}
        data-collapsed={collapsed}
      >
        {/* Brand */}
        <div className={cn(
          'flex items-center h-16 border-b border-border shrink-0',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}>
          {!collapsed ? (
            <>
              <Link href="/admin" className="flex items-center gap-2.5 min-w-0 group">
                <BrandMark size="md" />
                <div className="leading-tight min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">BabahAlgo</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Admin Console</div>
                </div>
              </Link>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Sembunyikan sidebar"
                title="Sembunyikan (Ctrl+B)"
              >
                <Icon icon={PanelLeftClose} size="sm" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-amber-50 shadow-sm hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Buka sidebar"
              title="Buka sidebar (Ctrl+B)"
            >
              <Icon icon={PanelLeftOpen} size="sm" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Search palette trigger */}
        {!collapsed ? (
          <div className="px-3 py-2 shrink-0">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cari menu admin"
            >
              <Icon icon={SearchIcon} size="sm" />
              <span className="flex-1 text-left">Cari menu…</span>
              <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 h-5 rounded border border-border bg-background text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          </div>
        ) : (
          <div className="px-2 py-2 shrink-0">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="w-full inline-flex items-center justify-center h-10 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cari menu (Ctrl+K)"
              title="Cari menu (Ctrl+K)"
            >
              <Icon icon={SearchIcon} size="md" />
            </button>
          </div>
        )}

        {/* Scrollable nav */}
        <nav role="navigation" aria-label="Admin sections" className="flex-1 overflow-y-auto overscroll-contain px-2 pb-4 space-y-3">
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
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-muted/40">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-amber-50 text-xs font-semibold shrink-0 shadow-sm">
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
              <Icon icon={LogOut} size="sm" className={collapsed ? '' : 'mr-2'} />
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
              onOpenPalette={() => { setMobileOpen(false); setPaletteOpen(true); }}
              userEmail={me?.email}
              userName={me?.name}
              userRole={me?.role}
            />,
            document.body,
          )
        : null}

      {/* Command palette (portal) */}
      {mounted && paletteOpen
        ? createPortal(
            <CommandPalette
              items={ALL_NAV_ITEMS}
              onClose={() => setPaletteOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 'h-4.5 w-4.5' : 'h-5 w-5';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg shrink-0',
        'bg-gradient-to-br from-amber-500 to-amber-600 text-amber-50 shadow-md',
        'ring-1 ring-amber-500/20',
        dim,
      )}
    >
      <MonitorSmartphone className={iconSize} strokeWidth={2.25} />
      <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20 pointer-events-none" />
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

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

  useEffect(() => {
    // Auto-expand group saat user navigate ke child item dari group lain — sync UX.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasActiveItem) setExpanded(true);
  }, [hasActiveItem]);

  if (collapsed) {
    return (
      <div className="space-y-1">
        {group.items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex items-center justify-center h-10 w-12 mx-auto rounded-lg transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-amber-500"
                />
              ) : null}
              <Icon icon={item.icon} size="md" />
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
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors',
          'text-muted-foreground/80 hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-2">
          <Icon icon={group.icon} size="sm" strokeWidth={2} />
          {group.label}
        </span>
        <Icon icon={expanded ? ChevronDown : ChevronRight} size="sm" />
      </button>
      {expanded ? (
        <div className="mt-1 space-y-0.5">
          {group.items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  active
                    ? 'bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-amber-500"
                  />
                ) : null}
                <Icon
                  icon={item.icon}
                  size="md"
                  className={cn(
                    'shrink-0 transition-colors',
                    active ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function MobileAdminDrawer({
  groups,
  isActive,
  onClose,
  onLogout,
  onOpenPalette,
  userEmail,
  userName,
  userRole,
}: {
  groups: NavGroup[];
  isActive: (href: string) => boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenPalette: () => void;
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
          <BrandMark size="sm" />
          <div className="leading-tight min-w-0">
            <div className="text-sm font-semibold text-foreground">BabahAlgo Admin</div>
            {(userName || userEmail) ? (
              <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{userName || userEmail}</div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenPalette}
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            aria-label="Cari menu"
          >
            <Icon icon={SearchIcon} size="lg" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 w-10 -mr-1 rounded-lg text-foreground hover:bg-muted active:scale-95 transition-all"
            aria-label="Tutup menu"
          >
            <Icon icon={X} size="lg" strokeWidth={2} />
          </button>
        </div>
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
          <Icon icon={LogOut} size="sm" className="mr-1.5" />
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
    // Auto-expand group saat user navigate ke child item dari group lain — sync UX.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasActiveItem) setExpanded(true);
  }, [hasActiveItem]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-2.5 rounded-md text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted/40',
        )}
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-2">
          <Icon icon={group.icon} size="sm" strokeWidth={2} />
          {group.label}
        </span>
        <Icon icon={expanded ? ChevronDown : ChevronRight} size="sm" />
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
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px]',
                  active
                    ? 'bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                {active ? (
                  <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-amber-500" />
                ) : null}
                <Icon icon={item.icon} size="md" className={active ? 'text-amber-700 dark:text-amber-300' : ''} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function CommandPalette({
  items,
  onClose,
}: {
  items: Array<NavItem & { group: string }>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q) ||
        i.href.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    // Reset selection index saat query berubah — sync state dengan filter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = filtered[activeIdx];
        if (target) {
          window.location.href = target.href;
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filtered, activeIdx]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cari menu"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup pencarian"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <Icon icon={SearchIcon} size="md" tone="muted" />
          <input
            type="search"
            autoFocus
            placeholder="Cari halaman, modul, action…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            aria-label="Cari menu"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 h-5 rounded border border-border bg-background text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Tidak ada menu cocok dengan &quot;{query}&quot;
            </div>
          ) : (
            <ul role="listbox" className="space-y-0.5">
              {filtered.map((item, idx) => {
                const active = idx === activeIdx;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                        active
                          ? 'bg-amber-500/15 text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                      )}
                    >
                      <IconCircle icon={item.icon} size="sm" tone={active ? 'accent' : 'muted'} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{item.group} · {item.href}</div>
                      </div>
                      {active ? (
                        <span className="text-[10px] font-mono text-muted-foreground">↵</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-border bg-muted/30 px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono">↑↓</kbd> navigasi
            {' '}
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono">↵</kbd> pilih
          </span>
          <span>{filtered.length} item</span>
        </div>
      </div>
    </div>
  );
}
