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
    { href: '/solutions/signal', label: 'Signal' },
    { href: '/solutions/pamm', label: 'PAMM' },
    { href: '/solutions/license', label: 'License' },
    { href: '/solutions/institutional', label: 'Institutional' },
    { href: '/pricing', label: 'Pricing' },
  ],
  research: [
    { href: '/research', label: 'Insights' },
    { href: '/research', label: 'Whitepapers' },
  ],
  company: [
    { href: '/about', label: 'About' },
    { href: '/about/team', label: 'Team' },
    { href: '/about/governance', label: 'Governance' },
    { href: '/contact', label: 'Contact' },
  ],
  legal: [
    { href: '/legal/terms', label: 'Terms' },
    { href: '/legal/privacy', label: 'Privacy' },
    { href: '/legal/risk-disclosure', label: 'Risk Disclosure' },
    { href: '/legal/regulatory', label: 'Regulatory' },
    { href: '/legal/cookies', label: 'Cookies' },
  ],
};

export function EnterpriseFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Top section */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/logo/babahalgo-horizontal-darkbg.svg"
              alt="BabahAlgo"
              width={120}
              height={24}
              className="h-6 w-auto mb-4 hidden dark:block"
            />
            <Image
              src="/logo/babahalgo-horizontal-lightbg.svg"
              alt="BabahAlgo"
              width={120}
              height={24}
              className="h-6 w-auto mb-4 dark:hidden"
            />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quantitative trading infrastructure.
              <br />
              Operated by CV Babah Digital.
            </p>
          </div>

          {/* Links */}
          <FooterColumn title="Platform" links={FOOTER_LINKS.platform} />
          <FooterColumn title="Solutions" links={FOOTER_LINKS.solutions} />
          <FooterColumn title="Research" links={FOOTER_LINKS.research} />
          <FooterColumn title="Company" links={FOOTER_LINKS.company} />
          <FooterColumn title="Legal" links={FOOTER_LINKS.legal} />
        </div>

        {/* Disclosure */}
        <div className="border-t border-border pt-8 mb-8">
          <div className="max-w-4xl">
            <p className="text-xs text-muted-foreground leading-relaxed uppercase tracking-wider font-medium mb-2">
              Risk Disclosure
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Trading instrumen finansial mengandung risiko kerugian yang signifikan dan mungkin tidak sesuai
              untuk semua investor. Kinerja masa lalu tidak menjamin hasil di masa depan. Seluruh keputusan
              perdagangan adalah tanggung jawab Anda sepenuhnya. BabahAlgo bukan pemberi nasihat keuangan
              dan tidak terdaftar sebagai pialang berjangka. Layanan yang disediakan bersifat teknologi
              perdagangan otomatis, bukan rekomendasi investasi.
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CV Babah Digital. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>EN / ID</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">{title}</h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-sm text-foreground/70 hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
