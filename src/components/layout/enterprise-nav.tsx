'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Menu, X, ChevronDown, ArrowRight, BookOpen, Users, FileCheck, ShieldCheck, Scale, Library, FileText, Bitcoin, TrendingUp, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { STRATEGY_ICONS } from '@/components/icons/strategy-icons';

// ─── Mega Menu Data ───
const PLATFORM_MENU = {
  platform: [
    { href: '/platform', label: 'Overview', desc: 'Platform architecture' },
    { href: '/platform/technology', label: 'Technology', desc: 'Infrastructure & stack' },
    { href: '/platform/risk-framework', label: 'Risk Framework', desc: '12-layer protection' },
    { href: '/platform/execution', label: 'Execution', desc: 'Sub-second order routing' },
    { href: '/platform/instruments', label: 'Instruments', desc: 'Forex, metals, energy' },
  ],
  strategies: [
    { href: '/platform/strategies/smc', label: 'SMC', desc: 'Smart Money Concepts' },
    { href: '/platform/strategies/wyckoff', label: 'Wyckoff', desc: 'Accumulation/Distribution' },
    { href: '/platform/strategies/astronacci', label: 'Astronacci', desc: 'Fibonacci astronomy' },
    { href: '/platform/strategies/ai-momentum', label: 'AI Momentum', desc: 'ML-driven signals' },
    { href: '/platform/strategies/oil-gas', label: 'Oil & Gas', desc: 'Energy sector focus' },
    { href: '/platform/strategies/smc-swing', label: 'SMC Swing', desc: 'Multi-day positions' },
  ],
  featured: {
    href: '/performance',
    label: 'Live Performance',
    desc: 'Track record, equity curves, and verified metrics updated in real-time.',
    cta: 'View track record',
  },
};

const SOLUTIONS_MENU = {
  forex: [
    { href: '/solutions/signal', label: 'Signal Service', desc: 'Real-time forex signals · from $49/mo', icon: TrendingUp },
    { href: '/solutions/pamm', label: 'PAMM Account', desc: 'Bot kelola dana · 20-30% profit share', icon: TrendingUp },
    { href: '/solutions/license', label: 'VPS License', desc: 'Bot di VPS pribadi · from $3,000', icon: TrendingUp },
    { href: '/solutions/institutional', label: 'Managed Account', desc: 'Custom institutional mandate', icon: Sparkles },
  ],
  crypto: [
    { href: '/solutions/crypto', label: 'Crypto Bot Overview', desc: 'Binance Futures · 6 strategi · 24/7', icon: Bitcoin },
    { href: '/solutions/crypto#basic', label: 'Crypto Basic', desc: '3 pair · 5x leverage · $49/mo', icon: Bitcoin },
    { href: '/solutions/crypto#pro', label: 'Crypto Pro', desc: '8 pair · 10x leverage · $199/mo', icon: Bitcoin },
    { href: '/solutions/crypto#hnwi', label: 'Crypto HNWI', desc: '12 pair + custom · $499/mo', icon: Bitcoin },
  ],
  register: [
    { href: '/register/signal', label: 'Register Signal', desc: 'Self-serve forex signup' },
    { href: '/register/pamm', label: 'Register PAMM', desc: 'Open managed account' },
    { href: '/register/crypto', label: 'Register Crypto', desc: 'Connect Binance + activate bot' },
    { href: '/register/institutional', label: 'Institutional Inquiry', desc: 'Schedule a briefing' },
  ],
};

const COMPANY_MENU = {
  about: [
    { href: '/about', label: 'Our Story', icon: BookOpen },
    { href: '/about', label: 'Mission & Approach', icon: BookOpen },
    { href: '/about', label: 'Why BabahAlgo', icon: BookOpen },
  ],
  governance: [
    { href: '/about/team', label: 'Team', icon: Users },
    { href: '/about/governance', label: 'Audit Reports', icon: FileCheck },
    { href: '/legal/risk-disclosure', label: 'Risk Disclosure', icon: ShieldCheck },
    { href: '/legal/regulatory', label: 'Regulatory Posture', icon: Scale },
  ],
  resources: [
    { href: '/research', label: 'Research Library', icon: Library },
    { href: '/research', label: 'Case Studies', icon: FileText },
  ],
};

export function EnterpriseNav() {
  const t = useTranslations('nav');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  return (
    <nav
      ref={menuRef}
      role="navigation"
      aria-label="Main navigation"
      className={`sticky top-0 z-50 h-16 transition-all duration-200 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-xl border-b border-border'
          : 'bg-background border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setActiveMenu(null)}>
          <Image
            src="/logo/babahalgo-horizontal-inverse.png"
            alt="BabahAlgo"
            width={180}
            height={36}
            className="h-9 w-auto hidden dark:block"
            priority
          />
          <Image
            src="/logo/babahalgo-horizontal-dual.png"
            alt="BabahAlgo"
            width={180}
            height={36}
            className="h-9 w-auto dark:hidden"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-0.5">
          <NavDropdown label={t('platform')} id="platform" activeMenu={activeMenu} onToggle={toggleMenu} />
          <NavDropdown label={t('solutions')} id="solutions" activeMenu={activeMenu} onToggle={toggleMenu} />
          <NavDropdown label="Company" id="company" activeMenu={activeMenu} onToggle={toggleMenu} />
          <Link
            href="/performance"
            className="nav-link"
            onClick={() => setActiveMenu(null)}
          >
            {t('performance')}
          </Link>
          <Link
            href="/research"
            className="nav-link"
            onClick={() => setActiveMenu(null)}
          >
            {t('research')}
          </Link>
        </div>

        {/* Right side */}
        <div className="hidden lg:flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <Link
            href="/login"
            className="nav-link"
          >
            {t('login')}
          </Link>
          <Link
            href="/contact"
            className="btn-primary px-5 py-2.5 rounded-md text-sm font-medium"
          >
            Schedule Briefing
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 text-muted-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ─── Mega Menu: Platform ─── */}
      {activeMenu === 'platform' && (
        <div className="mega-menu" role="menu">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
            {/* Platform links */}
            <div className="col-span-3">
              <MegaMenuHeading>Platform</MegaMenuHeading>
              <div className="space-y-0.5">
                {PLATFORM_MENU.platform.map((item) => (
                  <MegaMenuLink key={item.href + item.label} {...item} onClick={() => setActiveMenu(null)} />
                ))}
              </div>
            </div>
            {/* Strategies */}
            <div className="col-span-4">
              <MegaMenuHeading>Strategies</MegaMenuHeading>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                {PLATFORM_MENU.strategies.map((item) => {
                  const slug = item.href.split('/').pop() || '';
                  const Icon = STRATEGY_ICONS[slug];
                  return Icon ? (
                    <MegaMenuIconLink key={item.href} href={item.href} label={item.label} icon={Icon} onClick={() => setActiveMenu(null)} />
                  ) : (
                    <MegaMenuLink key={item.href} {...item} onClick={() => setActiveMenu(null)} />
                  );
                })}
              </div>
            </div>
            {/* Featured card */}
            <div className="col-span-5 pl-8 border-l border-white/8">
              <MegaMenuHeading>Featured</MegaMenuHeading>
              <Link
                href={PLATFORM_MENU.featured.href}
                className="block p-5 rounded-lg bg-white/[0.03] border border-white/8 hover:border-amber-500/30 hover:bg-white/[0.05] transition-all group"
                onClick={() => setActiveMenu(null)}
              >
                <p className="text-sm font-medium text-foreground mb-1">{PLATFORM_MENU.featured.label}</p>
                <p className="text-xs text-foreground/50 mb-4 leading-relaxed">{PLATFORM_MENU.featured.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium group-hover:gap-2.5 transition-all">
                  {PLATFORM_MENU.featured.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mega Menu: Solutions ─── */}
      {activeMenu === 'solutions' && (
        <div className="mega-menu" role="menu">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
            {/* Forex column */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex h-7 w-7 rounded-md bg-amber-500/15 border border-amber-500/30 items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                </span>
                <MegaMenuHeading className="!mb-0">Forex Products</MegaMenuHeading>
              </div>
              <div className="space-y-0.5">
                {SOLUTIONS_MENU.forex.map((item) => (
                  <MegaMenuIconLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    desc={item.desc}
                    icon={item.icon}
                    onClick={() => setActiveMenu(null)}
                  />
                ))}
              </div>
            </div>

            {/* Crypto column */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex h-7 w-7 rounded-md bg-violet-500/15 border border-violet-500/30 items-center justify-center">
                  <Bitcoin className="h-3.5 w-3.5 text-violet-300" />
                </span>
                <MegaMenuHeading className="!mb-0">Crypto Products</MegaMenuHeading>
              </div>
              <div className="space-y-0.5">
                {SOLUTIONS_MENU.crypto.map((item) => (
                  <MegaMenuIconLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    desc={item.desc}
                    icon={item.icon}
                    onClick={() => setActiveMenu(null)}
                  />
                ))}
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 mt-4 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                onClick={() => setActiveMenu(null)}
              >
                Bandingkan semua paket <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Get Started column */}
            <div className="col-span-4 pl-8 border-l border-white/8">
              <MegaMenuHeading>Get Started</MegaMenuHeading>
              <div className="space-y-0.5">
                {SOLUTIONS_MENU.register.map((item) => (
                  <MegaMenuLink key={item.href} {...item} onClick={() => setActiveMenu(null)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mega Menu: Company ─── */}
      {activeMenu === 'company' && (
        <div className="mega-menu" role="menu">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
            <div className="col-span-3">
              <MegaMenuHeading>About</MegaMenuHeading>
              <div className="space-y-0.5">
                {COMPANY_MENU.about.map((item, i) => (
                  <MegaMenuIconLink key={item.href + i} href={item.href} label={item.label} icon={item.icon} onClick={() => setActiveMenu(null)} />
                ))}
              </div>
            </div>
            <div className="col-span-3">
              <MegaMenuHeading>Governance</MegaMenuHeading>
              <div className="space-y-0.5">
                {COMPANY_MENU.governance.map((item) => (
                  <MegaMenuIconLink key={item.href + item.label} href={item.href} label={item.label} icon={item.icon} onClick={() => setActiveMenu(null)} />
                ))}
              </div>
            </div>
            <div className="col-span-3">
              <MegaMenuHeading>Resources</MegaMenuHeading>
              <div className="space-y-0.5">
                {COMPANY_MENU.resources.map((item) => (
                  <MegaMenuIconLink key={item.href + item.label} href={item.href} label={item.label} icon={item.icon} onClick={() => setActiveMenu(null)} />
                ))}
              </div>
            </div>
            <div className="col-span-3 pl-8 border-l border-white/8 flex flex-col justify-center">
              <Link
                href="/contact"
                className="block p-5 rounded-lg bg-white/[0.03] border border-white/8 hover:border-amber-500/30 hover:bg-white/[0.05] transition-all group"
                onClick={() => setActiveMenu(null)}
              >
                <p className="text-sm font-medium text-foreground mb-1">Get in touch</p>
                <p className="text-xs text-foreground/50 mb-3">Schedule a briefing or send us a message.</p>
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium group-hover:gap-2.5 transition-all">
                  Contact us <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mobile Menu ─── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-background z-40 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Platform */}
            <div>
              <MegaMenuHeading>Platform</MegaMenuHeading>
              <div className="space-y-2 pl-2">
                {PLATFORM_MENU.platform.map((item) => (
                  <Link key={item.href} href={item.href} className="block py-1.5 text-sm" onClick={() => setMobileOpen(false)}>{item.label}</Link>
                ))}
              </div>
              <MegaMenuHeading className="mt-4">Strategies</MegaMenuHeading>
              <div className="space-y-2 pl-2">
                {PLATFORM_MENU.strategies.map((item) => (
                  <Link key={item.href} href={item.href} className="block py-1.5 text-sm" onClick={() => setMobileOpen(false)}>{item.label}</Link>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Solutions — Forex */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                <MegaMenuHeading className="!mb-0">Forex</MegaMenuHeading>
              </div>
              <div className="space-y-2 pl-2">
                {SOLUTIONS_MENU.forex.map((item) => (
                  <Link key={item.href} href={item.href} className="block py-1.5" onClick={() => setMobileOpen(false)}>
                    <div className="text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Solutions — Crypto */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bitcoin className="h-4 w-4 text-violet-300" />
                <MegaMenuHeading className="!mb-0">Crypto</MegaMenuHeading>
              </div>
              <div className="space-y-2 pl-2">
                {SOLUTIONS_MENU.crypto.map((item) => (
                  <Link key={item.href} href={item.href} className="block py-1.5" onClick={() => setMobileOpen(false)}>
                    <div className="text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Company */}
            <div>
              <MegaMenuHeading>Company</MegaMenuHeading>
              <div className="space-y-2 pl-2">
                {COMPANY_MENU.about.map((item, i) => (
                  <Link key={item.href + i} href={item.href} className="block py-1.5 text-sm" onClick={() => setMobileOpen(false)}>{item.label}</Link>
                ))}
                {COMPANY_MENU.governance.map((item) => (
                  <Link key={item.href + item.label} href={item.href} className="block py-1.5 text-sm" onClick={() => setMobileOpen(false)}>{item.label}</Link>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Direct links */}
            <div className="space-y-2">
              <Link href="/performance" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('performance')}</Link>
              <Link href="/research" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('research')}</Link>
              <Link href="/pricing" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('pricing')}</Link>
            </div>

            <div className="border-t border-border" />

            {/* Get Started */}
            <div>
              <MegaMenuHeading>Get Started</MegaMenuHeading>
              <div className="space-y-2 pl-2">
                {SOLUTIONS_MENU.register.map((item) => (
                  <Link key={item.href} href={item.href} className="block py-1.5" onClick={() => setMobileOpen(false)}>
                    <div className="text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
              <Link
                href="/login"
                className="block text-center py-3 text-sm border border-border rounded-md"
                onClick={() => setMobileOpen(false)}
              >
                {t('login')}
              </Link>
              <Link
                href="/contact"
                className="block text-center py-3 text-sm btn-primary rounded-md font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Schedule Briefing
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
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
      className="block py-2 px-3 -mx-3 rounded-md hover:bg-white/[0.04] transition-colors group"
      onClick={onClick}
    >
      <div className="text-sm text-foreground group-hover:text-amber-400 transition-colors">{label}</div>
      {desc && <div className="text-xs text-foreground/40 mt-0.5">{desc}</div>}
    </Link>
  );
}

function MegaMenuIconLink({ href, label, desc, icon: Icon, onClick }: { href: string; label: string; desc?: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 py-2.5 px-3 -mx-3 rounded-md hover:bg-white/[0.04] transition-colors group"
      onClick={onClick}
    >
      <span className="w-9 h-9 rounded-md bg-white/[0.04] border border-white/8 flex items-center justify-center shrink-0 group-hover:border-amber-500/30 group-hover:bg-amber-500/[0.08] transition-all mt-0.5">
        <Icon className="w-4 h-4 text-foreground/50 group-hover:text-amber-400 transition-colors" />
      </span>
      <span className="flex flex-col min-w-0">
        <span className="text-sm text-foreground group-hover:text-amber-400 transition-colors leading-tight">{label}</span>
        {desc && <span className="text-xs text-foreground/40 mt-0.5 leading-snug">{desc}</span>}
      </span>
    </Link>
  );
}
