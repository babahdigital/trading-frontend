'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Menu, X, ChevronDown, ArrowRight, BookOpen, Users, FileCheck, ShieldCheck, Scale, Library, FileText, Bitcoin, TrendingUp, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { STRATEGY_ICONS } from '@/components/icons/strategy-icons';

// ─── Mega Menu Data — labels/descs are i18n keys, resolved via t() at render ───
const PLATFORM_MENU = {
  platform: [
    { href: '/platform', labelKey: 'platform_overview_label', descKey: 'platform_overview_desc' },
    { href: '/platform/technology', labelKey: 'platform_tech_label', descKey: 'platform_tech_desc' },
    { href: '/platform/risk-framework', labelKey: 'platform_risk_label', descKey: 'platform_risk_desc' },
    { href: '/platform/execution', labelKey: 'platform_exec_label', descKey: 'platform_exec_desc' },
    { href: '/platform/instruments', labelKey: 'platform_inst_label', descKey: 'platform_inst_desc' },
  ],
  strategies: [
    { href: '/platform/strategies/smc', labelKey: 'strat_smc_label', descKey: 'strat_smc_desc' },
    { href: '/platform/strategies/wyckoff', labelKey: 'strat_wyckoff_label', descKey: 'strat_wyckoff_desc' },
    { href: '/platform/strategies/astronacci', labelKey: 'strat_astro_label', descKey: 'strat_astro_desc' },
    { href: '/platform/strategies/ai-momentum', labelKey: 'strat_ai_label', descKey: 'strat_ai_desc' },
    { href: '/platform/strategies/oil-gas', labelKey: 'strat_oil_label', descKey: 'strat_oil_desc' },
    { href: '/platform/strategies/smc-swing', labelKey: 'strat_smc_swing_label', descKey: 'strat_smc_swing_desc' },
  ],
  featured: {
    href: '/performance',
    labelKey: 'featured_label',
    descKey: 'featured_desc',
    ctaKey: 'featured_cta',
  },
};

const SOLUTIONS_MENU = {
  forex: [
    { href: '/solutions/signal', labelKey: 'forex_signal_label', descKey: 'forex_signal_desc', icon: TrendingUp },
    { href: '/solutions/license', labelKey: 'forex_license_label', descKey: 'forex_license_desc', icon: TrendingUp },
    { href: '/solutions/institutional', labelKey: 'forex_inst_label', descKey: 'forex_inst_desc', icon: Sparkles },
  ],
  crypto: [
    { href: '/solutions/crypto', labelKey: 'crypto_overview_label', descKey: 'crypto_overview_desc', icon: Bitcoin },
    { href: '/solutions/crypto#basic', labelKey: 'crypto_basic_label', descKey: 'crypto_basic_desc', icon: Bitcoin },
    { href: '/solutions/crypto#pro', labelKey: 'crypto_pro_label', descKey: 'crypto_pro_desc', icon: Bitcoin },
    { href: '/solutions/crypto#hnwi', labelKey: 'crypto_hnwi_label', descKey: 'crypto_hnwi_desc', icon: Bitcoin },
  ],
  register: [
    { href: '/demo', labelKey: 'register_demo_label', descKey: 'register_demo_desc' },
    { href: '/register/signal', labelKey: 'register_signal_label', descKey: 'register_signal_desc' },
    { href: '/register/crypto', labelKey: 'register_crypto_label', descKey: 'register_crypto_desc' },
    { href: '/register/vps', labelKey: 'register_vps_label', descKey: 'register_vps_desc' },
    { href: '/register/institutional', labelKey: 'register_inst_label', descKey: 'register_inst_desc' },
  ],
};

const COMPANY_MENU = {
  about: [
    { href: '/about', labelKey: 'company_about_story', icon: BookOpen },
    { href: '/about', labelKey: 'company_about_mission', icon: BookOpen },
    { href: '/about', labelKey: 'company_about_why', icon: BookOpen },
  ],
  governance: [
    { href: '/about/team', labelKey: 'company_gov_team', icon: Users },
    { href: '/about/governance', labelKey: 'company_gov_audit', icon: FileCheck },
    { href: '/legal/risk-disclosure', labelKey: 'company_gov_risk', icon: ShieldCheck },
    { href: '/legal/regulatory', labelKey: 'company_gov_reg', icon: Scale },
  ],
  resources: [
    { href: '/research', labelKey: 'company_res_library', icon: Library },
    { href: '/research', labelKey: 'company_res_cases', icon: FileText },
  ],
};

export function EnterpriseNav() {
  const t = useTranslations('nav');
  const tm = useTranslations('nav.mega');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lockedScrollY = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // iOS-safe body scroll lock — store position, fix body, restore on unlock.
  // Avoids the bug where overflow:hidden mid-scroll causes fixed children to
  // render at the wrong viewport coordinates.
  useEffect(() => {
    if (!mobileOpen) return;
    lockedScrollY.current = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${lockedScrollY.current}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.classList.add('menu-open');
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.classList.remove('menu-open');
      window.scrollTo(0, lockedScrollY.current);
    };
  }, [mobileOpen]);

  const toggleMenu = useCallback((menu: string) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  }, []);

  const closeAll = useCallback(() => {
    setActiveMenu(null);
    setMobileOpen(false);
  }, []);

  return (
    <>
      <nav
        ref={menuRef}
        role="navigation"
        aria-label="Main navigation"
        className={`sticky top-0 inset-x-0 z-[80] h-16 transition-all duration-200 ${
          scrolled
            ? 'bg-background/95 backdrop-blur-xl border-b border-border'
            : 'bg-background/80 backdrop-blur border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" onClick={closeAll}>
            {/* Logo PNG asal: 699x175 (~4:1). Pakai aspect ratio yang akurat
                supaya tidak ketarik. height-only via Tailwind, width otomatis
                dari intrinsic ratio. */}
            <Image
              src="/logo/babahalgo-header-dark.png"
              alt="BabahAlgo"
              width={160}
              height={40}
              className="h-9 w-auto hidden dark:block"
              style={{ height: 'auto', maxHeight: 36 }}
              priority
            />
            <Image
              src="/logo/babahalgo-header-light.png"
              alt="BabahAlgo"
              width={160}
              height={40}
              className="h-9 w-auto dark:hidden"
              style={{ height: 'auto', maxHeight: 36 }}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5">
            <NavDropdown label={t('platform')} id="platform" activeMenu={activeMenu} onToggle={toggleMenu} />
            <NavDropdown label={t('solutions')} id="solutions" activeMenu={activeMenu} onToggle={toggleMenu} />
            <NavDropdown label={t('company')} id="company" activeMenu={activeMenu} onToggle={toggleMenu} />
            <Link
              href="/performance"
              className="nav-link"
              onClick={closeAll}
            >
              {t('performance')}
            </Link>
            <Link
              href="/research"
              className="nav-link"
              onClick={closeAll}
            >
              {t('research')}
            </Link>
          </div>

          {/* Right side */}
          <div className="hidden lg:flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link href="/login" className="nav-link">
              {t('login')}
            </Link>
            <Link
              href="/contact"
              className="btn-primary px-5 py-2.5 rounded-md text-sm font-medium"
            >
              {t('schedule_briefing')}
            </Link>
          </div>

          {/* Mobile toggle (always reachable — nav is fixed) */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center p-2 -mr-2 rounded-md text-foreground hover:bg-muted/60 active:scale-95 transition-all"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* ─── Desktop Mega Menu: Platform ─── */}
        {activeMenu === 'platform' && (
          <div className="mega-menu hidden lg:block" role="menu">
            <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
              <div className="col-span-3">
                <MegaMenuHeading>{tm('platform_heading')}</MegaMenuHeading>
                <div className="space-y-0.5">
                  {PLATFORM_MENU.platform.map((item) => (
                    <MegaMenuLink key={item.href + item.labelKey} href={item.href} label={tm(item.labelKey)} desc={tm(item.descKey)} onClick={closeAll} />
                  ))}
                </div>
              </div>
              <div className="col-span-4">
                <MegaMenuHeading>{tm('strategies_heading')}</MegaMenuHeading>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                  {PLATFORM_MENU.strategies.map((item) => {
                    const slug = item.href.split('/').pop() || '';
                    const Icon = STRATEGY_ICONS[slug];
                    return Icon ? (
                      <MegaMenuIconLink key={item.href} href={item.href} label={tm(item.labelKey)} icon={Icon} onClick={closeAll} />
                    ) : (
                      <MegaMenuLink key={item.href} href={item.href} label={tm(item.labelKey)} desc={tm(item.descKey)} onClick={closeAll} />
                    );
                  })}
                </div>
              </div>
              <div className="col-span-5 pl-8 border-l border-border/60">
                <MegaMenuHeading>{tm('featured_heading')}</MegaMenuHeading>
                <Link
                  href={PLATFORM_MENU.featured.href}
                  className="block p-5 rounded-lg bg-muted/40 border border-border/60 hover:border-amber-500/30 hover:bg-muted/60 transition-all group"
                  onClick={closeAll}
                >
                  <p className="text-sm font-medium text-foreground mb-1">{tm(PLATFORM_MENU.featured.labelKey)}</p>
                  <p className="text-xs text-foreground/50 mb-4 leading-relaxed">{tm(PLATFORM_MENU.featured.descKey)}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 font-medium group-hover:gap-2.5 transition-all">
                    {tm(PLATFORM_MENU.featured.ctaKey)} <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ─── Desktop Mega Menu: Solutions ─── */}
        {activeMenu === 'solutions' && (
          <div className="mega-menu hidden lg:block" role="menu">
            <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
              <div className="col-span-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex h-7 w-7 rounded-md bg-amber-500/15 border border-amber-500/30 items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                  </span>
                  <MegaMenuHeading className="!mb-0">{tm('forex_heading')}</MegaMenuHeading>
                </div>
                <div className="space-y-0.5">
                  {SOLUTIONS_MENU.forex.map((item) => (
                    <MegaMenuIconLink key={item.href} href={item.href} label={tm(item.labelKey)} desc={tm(item.descKey)} icon={item.icon} onClick={closeAll} />
                  ))}
                </div>
              </div>

              <div className="col-span-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex h-7 w-7 rounded-md bg-violet-500/15 border border-violet-500/30 items-center justify-center">
                    <Bitcoin className="h-3.5 w-3.5 text-violet-500 dark:text-violet-300" />
                  </span>
                  <MegaMenuHeading className="!mb-0">{tm('crypto_heading')}</MegaMenuHeading>
                </div>
                <div className="space-y-0.5">
                  {SOLUTIONS_MENU.crypto.map((item) => (
                    <MegaMenuIconLink key={item.href} href={item.href} label={tm(item.labelKey)} desc={tm(item.descKey)} icon={item.icon} onClick={closeAll} />
                  ))}
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 mt-4 text-xs text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                  onClick={closeAll}
                >
                  {tm('compare_packages')} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="col-span-4 pl-8 border-l border-border/60">
                <MegaMenuHeading>{tm('started_heading')}</MegaMenuHeading>
                <div className="space-y-0.5">
                  {SOLUTIONS_MENU.register.map((item) => (
                    <MegaMenuLink key={item.href} href={item.href} label={tm(item.labelKey)} desc={tm(item.descKey)} onClick={closeAll} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Desktop Mega Menu: Company ─── */}
        {activeMenu === 'company' && (
          <div className="mega-menu hidden lg:block" role="menu">
            <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
              <div className="col-span-3">
                <MegaMenuHeading>{tm('company_about_heading')}</MegaMenuHeading>
                <div className="space-y-0.5">
                  {COMPANY_MENU.about.map((item, i) => (
                    <MegaMenuIconLink key={item.href + i} href={item.href} label={tm(item.labelKey)} icon={item.icon} onClick={closeAll} />
                  ))}
                </div>
              </div>
              <div className="col-span-3">
                <MegaMenuHeading>{tm('company_governance_heading')}</MegaMenuHeading>
                <div className="space-y-0.5">
                  {COMPANY_MENU.governance.map((item) => (
                    <MegaMenuIconLink key={item.href + item.labelKey} href={item.href} label={tm(item.labelKey)} icon={item.icon} onClick={closeAll} />
                  ))}
                </div>
              </div>
              <div className="col-span-3">
                <MegaMenuHeading>{tm('company_resources_heading')}</MegaMenuHeading>
                <div className="space-y-0.5">
                  {COMPANY_MENU.resources.map((item) => (
                    <MegaMenuIconLink key={item.href + item.labelKey} href={item.href} label={tm(item.labelKey)} icon={item.icon} onClick={closeAll} />
                  ))}
                </div>
              </div>
              <div className="col-span-3 pl-8 border-l border-border/60 flex flex-col justify-center">
                <Link
                  href="/contact"
                  className="block p-5 rounded-lg bg-muted/40 border border-border/60 hover:border-amber-500/30 hover:bg-muted/60 transition-all group"
                  onClick={closeAll}
                >
                  <p className="text-sm font-medium text-foreground mb-1">{tm('contact_label')}</p>
                  <p className="text-xs text-foreground/50 mb-3">{tm('contact_desc')}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 font-medium group-hover:gap-2.5 transition-all">
                    {tm('contact_cta')} <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ─── Mobile Menu — Portal so it escapes any sticky/transformed ancestor ─── */}
      {mounted && mobileOpen
        ? createPortal(
            <MobileMenu
              t={t}
              tm={tm}
              onClose={() => setMobileOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

// ─── Mobile Menu (rendered via portal) ───

function MobileMenu({
  t,
  tm,
  onClose,
}: {
  t: ReturnType<typeof useTranslations>;
  tm: ReturnType<typeof useTranslations>;
  onClose: () => void;
}) {
  return (
    <div
      id="mobile-nav-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="lg:hidden fixed inset-0 z-[90] flex flex-col bg-background"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border bg-background/95 backdrop-blur shrink-0">
        <span className="text-base font-semibold text-foreground">Menu</span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center p-2 -mr-2 rounded-md text-foreground hover:bg-muted/60 active:scale-95 transition-all"
          aria-label="Tutup menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-6 space-y-7">
        <div>
          <MegaMenuHeading>{tm('platform_heading')}</MegaMenuHeading>
          <div className="space-y-1 pl-1">
            {PLATFORM_MENU.platform.map((item) => (
              <Link key={item.href} href={item.href} className="block py-2 text-sm text-foreground/85 hover:text-amber-500 dark:hover:text-amber-400 transition-colors" onClick={onClose}>
                {tm(item.labelKey)}
              </Link>
            ))}
          </div>
          <MegaMenuHeading className="mt-5">{tm('strategies_heading')}</MegaMenuHeading>
          <div className="grid grid-cols-1 gap-1 pl-1">
            {PLATFORM_MENU.strategies.map((item) => (
              <Link key={item.href} href={item.href} className="block py-2 text-sm text-foreground/85 hover:text-amber-500 dark:hover:text-amber-400 transition-colors" onClick={onClose}>
                {tm(item.labelKey)}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-border" />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            <MegaMenuHeading className="!mb-0">{tm('forex_heading')}</MegaMenuHeading>
          </div>
          <div className="space-y-1 pl-1">
            {SOLUTIONS_MENU.forex.map((item) => (
              <Link key={item.href} href={item.href} className="block py-2" onClick={onClose}>
                <div className="text-sm text-foreground">{tm(item.labelKey)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{tm(item.descKey)}</div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bitcoin className="h-4 w-4 text-violet-500 dark:text-violet-300" />
            <MegaMenuHeading className="!mb-0">{tm('crypto_heading')}</MegaMenuHeading>
          </div>
          <div className="space-y-1 pl-1">
            {SOLUTIONS_MENU.crypto.map((item) => (
              <Link key={item.href} href={item.href} className="block py-2" onClick={onClose}>
                <div className="text-sm text-foreground">{tm(item.labelKey)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{tm(item.descKey)}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-border" />

        <div>
          <MegaMenuHeading>{t('company')}</MegaMenuHeading>
          <div className="space-y-1 pl-1">
            {COMPANY_MENU.about.map((item, i) => (
              <Link key={item.href + i} href={item.href} className="block py-2 text-sm text-foreground/85 hover:text-amber-500 dark:hover:text-amber-400 transition-colors" onClick={onClose}>
                {tm(item.labelKey)}
              </Link>
            ))}
            {COMPANY_MENU.governance.map((item) => (
              <Link key={item.href + item.labelKey} href={item.href} className="block py-2 text-sm text-foreground/85 hover:text-amber-500 dark:hover:text-amber-400 transition-colors" onClick={onClose}>
                {tm(item.labelKey)}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-border" />

        <div className="space-y-1">
          <Link href="/performance" className="block py-2.5 text-sm text-foreground/85 hover:text-amber-500 dark:hover:text-amber-400 transition-colors" onClick={onClose}>{t('performance')}</Link>
          <Link href="/research" className="block py-2.5 text-sm text-foreground/85 hover:text-amber-500 dark:hover:text-amber-400 transition-colors" onClick={onClose}>{t('research')}</Link>
          <Link href="/pricing" className="block py-2.5 text-sm text-foreground/85 hover:text-amber-500 dark:hover:text-amber-400 transition-colors" onClick={onClose}>{t('pricing')}</Link>
        </div>

        <div className="border-t border-border" />

        <div>
          <MegaMenuHeading>{tm('started_heading')}</MegaMenuHeading>
          <div className="space-y-1 pl-1">
            {SOLUTIONS_MENU.register.map((item) => (
              <Link key={item.href} href={item.href} className="block py-2" onClick={onClose}>
                <div className="text-sm text-foreground">{tm(item.labelKey)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{tm(item.descKey)}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky footer with CTAs */}
      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-4 sm:px-6 py-4 space-y-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center py-3 text-sm font-medium border border-border rounded-md text-foreground hover:bg-muted/60 transition-colors"
            onClick={onClose}
          >
            {t('login')}
          </Link>
          <Link
            href="/contact"
            className="btn-primary justify-center py-3 text-sm font-medium rounded-md"
            onClick={onClose}
          >
            {t('schedule_briefing')}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function NavDropdown({ label, id, activeMenu, onToggle }: { label: string; id: string; activeMenu: string | null; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(id)}
      className={`nav-link inline-flex items-center gap-1 ${activeMenu === id ? 'text-foreground' : ''}`}
      aria-expanded={activeMenu === id}
      aria-haspopup="true"
    >
      {label}
      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeMenu === id ? 'rotate-180' : ''}`} />
    </button>
  );
}

function MegaMenuHeading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h4 className={`t-eyebrow mb-4 ${className}`}>{children}</h4>
  );
}

function MegaMenuLink({ href, label, desc, onClick }: { href: string; label: string; desc?: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      className="block py-2 px-3 -mx-3 rounded-md hover:bg-muted/50 transition-colors group"
      onClick={onClick}
    >
      <div className="text-sm text-foreground group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">{label}</div>
      {desc && <div className="text-xs text-foreground/40 mt-0.5">{desc}</div>}
    </Link>
  );
}

function MegaMenuIconLink({ href, label, desc, icon: Icon, onClick }: { href: string; label: string; desc?: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-md hover:bg-muted/50 transition-colors group"
      onClick={onClick}
    >
      <span className="inline-flex w-9 h-9 rounded-md bg-muted/50 border border-border/60 items-center justify-center shrink-0 group-hover:border-amber-500/30 group-hover:bg-amber-500/[0.08] transition-all">
        <Icon className="w-4 h-4 text-foreground/60 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" />
      </span>
      <span className="flex flex-col min-w-0 leading-tight">
        <span className="text-sm font-medium text-foreground group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">{label}</span>
        {desc && <span className="text-xs text-foreground/50 mt-0.5 leading-snug">{desc}</span>}
      </span>
    </Link>
  );
}
