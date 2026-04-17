'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Menu, X, ChevronDown } from 'lucide-react';
import Image from 'next/image';

// ─── Mega Menu Data ───
const PLATFORM_MENU = {
  platform: [
    { href: '/platform', label: 'Overview' },
    { href: '/platform/technology', label: 'Technology' },
    { href: '/platform/risk-framework', label: 'Risk Framework' },
    { href: '/platform/execution', label: 'Execution' },
    { href: '/platform/instruments', label: 'Instruments' },
  ],
  strategies: [
    { href: '/platform/strategies/smc', label: 'SMC' },
    { href: '/platform/strategies/wyckoff', label: 'Wyckoff' },
    { href: '/platform/strategies/astronacci', label: 'Astronacci' },
    { href: '/platform/strategies/ai-momentum', label: 'AI Momentum' },
    { href: '/platform/strategies/oil-gas', label: 'Oil & Gas' },
    { href: '/platform/strategies/smc-swing', label: 'SMC Swing' },
  ],
  resources: [
    { href: '/research', label: 'Whitepapers', external: false },
    { href: '/about/governance', label: 'Audit Reports', external: false },
  ],
};

const SOLUTIONS_MENU = {
  individuals: [
    { href: '/solutions/signal', label: 'Signal Service', desc: 'Starting $49/mo' },
  ],
  professionals: [
    { href: '/solutions/pamm', label: 'PAMM Account', desc: 'From 20% profit share' },
    { href: '/solutions/license', label: 'VPS License', desc: 'From $3,000' },
  ],
  institutions: [
    { href: '/solutions/institutional', label: 'Managed Account', desc: 'Custom mandate' },
  ],
  register: [
    { href: '/register/signal', label: 'Register Signal', desc: 'Self-serve signup' },
    { href: '/register/pamm', label: 'Register PAMM', desc: 'Open managed account' },
    { href: '/register/institutional', label: 'Institutional Inquiry', desc: 'Schedule a briefing' },
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
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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
        <div className="hidden lg:flex items-center gap-1">
          {/* Platform dropdown */}
          <button
            onClick={() => toggleMenu('platform')}
            className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('platform')}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeMenu === 'platform' ? 'rotate-180' : ''}`} />
          </button>

          {/* Solutions dropdown */}
          <button
            onClick={() => toggleMenu('solutions')}
            className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('solutions')}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeMenu === 'solutions' ? 'rotate-180' : ''}`} />
          </button>

          <Link
            href="/performance"
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setActiveMenu(null)}
          >
            {t('performance')}
          </Link>

          <Link
            href="/research"
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setActiveMenu(null)}
          >
            {t('research')}
          </Link>

          <Link
            href="/about"
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setActiveMenu(null)}
          >
            {t('about')}
          </Link>
        </div>

        {/* Right side */}
        <div className="hidden lg:flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            {t('login')}
          </Link>
          <Link
            href="/contact"
            className="text-sm px-5 py-2.5 rounded-md bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
          >
            Schedule Briefing
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 text-muted-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ─── Mega Menu: Platform ─── */}
      {activeMenu === 'platform' && (
        <div className="hidden lg:block absolute top-16 left-0 right-0 bg-background border-b border-border animate-slide-down">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-3 gap-12">
            <div>
              <h4 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Platform</h4>
              <div className="space-y-1">
                {PLATFORM_MENU.platform.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block py-2 text-sm text-foreground hover:text-accent transition-colors"
                    onClick={() => setActiveMenu(null)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Strategies</h4>
              <div className="space-y-1">
                {PLATFORM_MENU.strategies.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block py-2 text-sm text-foreground hover:text-accent transition-colors"
                    onClick={() => setActiveMenu(null)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Resources</h4>
              <div className="space-y-1">
                {PLATFORM_MENU.resources.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block py-2 text-sm text-foreground hover:text-accent transition-colors"
                    onClick={() => setActiveMenu(null)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mega Menu: Solutions ─── */}
      {activeMenu === 'solutions' && (
        <div className="hidden lg:block absolute top-16 left-0 right-0 bg-background border-b border-border animate-slide-down">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-4 gap-12">
            <div>
              <h4 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">For Individuals</h4>
              <div className="space-y-3">
                {SOLUTIONS_MENU.individuals.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block group"
                    onClick={() => setActiveMenu(null)}
                  >
                    <div className="text-sm text-foreground group-hover:text-accent transition-colors">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </Link>
                ))}
                <Link
                  href="/pricing"
                  className="inline-block mt-2 text-xs text-accent hover:text-accent/80 transition-colors"
                  onClick={() => setActiveMenu(null)}
                >
                  Compare all plans
                </Link>
              </div>
            </div>
            <div>
              <h4 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">For Professionals</h4>
              <div className="space-y-3">
                {SOLUTIONS_MENU.professionals.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block group"
                    onClick={() => setActiveMenu(null)}
                  >
                    <div className="text-sm text-foreground group-hover:text-accent transition-colors">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">For Institutions</h4>
              <div className="space-y-3">
                {SOLUTIONS_MENU.institutions.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block group"
                    onClick={() => setActiveMenu(null)}
                  >
                    <div className="text-sm text-foreground group-hover:text-accent transition-colors">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Get Started</h4>
              <div className="space-y-3">
                {SOLUTIONS_MENU.register.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block group"
                    onClick={() => setActiveMenu(null)}
                  >
                    <div className="text-sm text-foreground group-hover:text-accent transition-colors">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </Link>
                ))}
              </div>
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
              <h4 className="text-label-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Platform</h4>
              <div className="space-y-2 pl-2">
                {PLATFORM_MENU.platform.map((item) => (
                  <Link key={item.href} href={item.href} className="block py-1.5 text-sm" onClick={() => setMobileOpen(false)}>{item.label}</Link>
                ))}
              </div>
              <h4 className="text-label-sm font-medium text-muted-foreground mt-4 mb-3 uppercase tracking-wider">Strategies</h4>
              <div className="space-y-2 pl-2">
                {PLATFORM_MENU.strategies.map((item) => (
                  <Link key={item.href} href={item.href} className="block py-1.5 text-sm" onClick={() => setMobileOpen(false)}>{item.label}</Link>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Solutions */}
            <div>
              <h4 className="text-label-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Solutions</h4>
              <div className="space-y-2 pl-2">
                {[...SOLUTIONS_MENU.individuals, ...SOLUTIONS_MENU.professionals, ...SOLUTIONS_MENU.institutions].map((item) => (
                  <Link key={item.href} href={item.href} className="block py-1.5" onClick={() => setMobileOpen(false)}>
                    <div className="text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Direct links */}
            <div className="space-y-2">
              <Link href="/performance" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('performance')}</Link>
              <Link href="/research" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('research')}</Link>
              <Link href="/pricing" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('pricing')}</Link>
              <Link href="/about" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('about')}</Link>
            </div>

            <div className="border-t border-border" />

            {/* Get Started */}
            <div>
              <h4 className="text-label-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Get Started</h4>
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
              <LanguageSwitcher />
              <Link
                href="/login"
                className="block text-center py-3 text-sm border border-border rounded-md"
                onClick={() => setMobileOpen(false)}
              >
                {t('login')}
              </Link>
              <Link
                href="/contact"
                className="block text-center py-3 text-sm bg-accent text-accent-foreground rounded-md font-medium"
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
