import { Link } from '@/i18n/navigation';
import Image from 'next/image';

const FOOTER_LINKS = {
  platform: [
    { href: '/platform', label: 'Overview' },
    { href: '/platform/strategies/smc', label: 'Strategies' },
    { href: '/platform/technology', label: 'Technology' },
    { href: '/platform/risk-framework', label: 'Risk Framework' },
    { href: '/performance', label: 'Performance' },
  ],
  solutions: [
    { href: '/solutions/signal', label: 'Signal Standard' },
    { href: '/solutions/signal', label: 'Signal Pro' },
    { href: '/solutions/pamm', label: 'PAMM Standard' },
    { href: '/solutions/pamm', label: 'PAMM Premier' },
    { href: '/solutions/institutional', label: 'Institutional' },
  ],
  getStarted: [
    { href: '/register/signal', label: 'Open Signal Account' },
    { href: '/register/pamm', label: 'Apply for PAMM' },
    { href: '/register/institutional', label: 'Institutional Inquiry' },
    { href: '/contact', label: 'Schedule Briefing' },
  ],
  company: [
    { href: '/about', label: 'About' },
    { href: '/about/team', label: 'Team' },
    { href: '/about/governance', label: 'Governance' },
    { href: '/research', label: 'Research' },
    { href: '/contact', label: 'Contact' },
  ],
  legal: [
    { href: '/legal/terms', label: 'Terms of Service' },
    { href: '/legal/privacy', label: 'Privacy Policy' },
    { href: '/legal/risk-disclosure', label: 'Risk Disclosure' },
    { href: '/legal/regulatory', label: 'Regulatory' },
    { href: '/legal/cookies', label: 'Cookies' },
  ],
};

export function EnterpriseFooter() {
  return (
    <footer className="border-t border-white/8" style={{ background: 'var(--brand-midnight)' }}>
      <div className="container-default px-6 pt-20 pb-8">
        {/* Top section — Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-8 mb-16">
          {/* Brand column */}
          <div className="col-span-2">
            <Image
              src="/logo/babahalgo-horizontal-inverse.png"
              alt="BabahAlgo"
              width={160}
              height={32}
              className="h-8 w-auto mb-6 hidden dark:block"
            />
            <Image
              src="/logo/babahalgo-horizontal-dual.png"
              alt="BabahAlgo"
              width={160}
              height={32}
              className="h-8 w-auto mb-6 dark:hidden"
            />
            <p className="font-display text-lg italic text-foreground/70 leading-snug mb-4">
              Autonomous Intelligence.<br />
              Institutional Precision.
            </p>
            <p className="t-body-sm text-ink-400">
              Quantitative trading infrastructure.<br />
              Operated by CV Babah Digital.
            </p>
          </div>

          {/* Links */}
          <FooterColumn title="Platform" links={FOOTER_LINKS.platform} />
          <FooterColumn title="Solutions" links={FOOTER_LINKS.solutions} />
          <FooterColumn title="Get Started" links={FOOTER_LINKS.getStarted} />
          <FooterColumn title="Company" links={FOOTER_LINKS.company} />
          <FooterColumn title="Legal" links={FOOTER_LINKS.legal} />
        </div>

        {/* Legal entity + Contact */}
        <div className="border-t border-white/8 pt-8 mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <p className="t-body-sm text-ink-400 mb-2">
              CV Babah Digital &middot; Indonesia
            </p>
            <div className="flex flex-wrap items-center gap-4 t-body-sm text-ink-400">
              <a href="mailto:hello@babahalgo.com" className="hover:text-amber-400 transition-colors">
                hello@babahalgo.com
              </a>
              <span className="w-px h-3 bg-white/10" />
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
                WhatsApp
              </a>
              <span className="w-px h-3 bg-white/10" />
              <a href="https://t.me/babahalgo" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
                Telegram
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-400">
            <span className="uppercase tracking-wider">EN / ID</span>
          </div>
        </div>

        {/* Risk Disclosure */}
        <div className="border-t border-white/8 pt-8 mb-8">
          <div className="max-w-4xl">
            <p className="t-eyebrow text-ink-400 mb-3">RISK DISCLOSURE</p>
            <p className="text-xs text-ink-400 leading-relaxed italic">
              Trading instrumen finansial mengandung risiko substansial dan dapat mengakibatkan kerugian
              sebagian atau seluruh modal. Kinerja masa lalu tidak menjamin hasil di masa depan.
              BabahAlgo bukan financial advisor. Konsultasikan dengan penasihat keuangan berlisensi
              sebelum mengambil keputusan investasi. Layanan yang disediakan bersifat teknologi
              perdagangan otomatis, bukan rekomendasi investasi.
            </p>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-400">
            &copy; {new Date().getFullYear()} CV Babah Digital. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="t-eyebrow mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((link, i) => (
          <li key={link.href + link.label + i}>
            <Link
              href={link.href}
              className="t-body-sm text-foreground/60 hover:text-amber-400 transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
