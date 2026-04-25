'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';

const FOOTER_LINKS = {
  platform: [
    { href: '/platform', label: 'Overview' },
    { href: '/platform/strategies/smc', label: 'Strategi' },
    { href: '/platform/technology', label: 'Teknologi' },
    { href: '/platform/risk-framework', label: 'Risk Framework' },
    { href: '/performance', label: 'Performa' },
  ],
  solutions: [
    { href: '/solutions/signal', label: 'Forex Signal' },
    { href: '/solutions/pamm', label: 'PAMM Account' },
    { href: '/solutions/license', label: 'VPS License' },
    { href: '/solutions/crypto', label: 'Crypto Bot' },
    { href: '/solutions/institutional', label: 'Institutional' },
  ],
  getStarted: [
    { href: '/register/signal', label: 'Daftar Signal' },
    { href: '/register/crypto', label: 'Daftar Crypto Bot' },
    { href: '/register/pamm', label: 'Daftar PAMM' },
    { href: '/register/institutional', label: 'Institutional Inquiry' },
    { href: '/contact', label: 'Schedule Briefing' },
  ],
  company: [
    { href: '/about', label: 'Tentang Kami' },
    { href: '/about/team', label: 'Tim' },
    { href: '/about/governance', label: 'Governance' },
    { href: '/research', label: 'Research' },
    { href: '/changelog', label: 'Changelog' },
    { href: '/status', label: 'Status' },
    { href: '/contact', label: 'Kontak' },
  ],
  legal: [
    { href: '/legal/terms', label: 'Terms of Service' },
    { href: '/legal/privacy', label: 'Privacy Policy' },
    { href: '/legal/risk-disclosure', label: 'Risk Disclosure' },
    { href: '/legal/regulatory', label: 'Regulatory' },
    { href: '/legal/cookies', label: 'Cookies' },
  ],
};

interface ContactInfo {
  email: string;
  whatsappUrl: string | null;
  whatsappLabel: string | null;
  telegramUrl: string | null;
  exnessUrl: string | null;
}

const FALLBACK_CONTACT: ContactInfo = {
  email: 'hello@babahalgo.com',
  whatsappUrl: null,
  whatsappLabel: null,
  telegramUrl: 'https://t.me/babahalgo',
  exnessUrl: null,
};

export function EnterpriseFooter() {
  const [contact, setContact] = useState<ContactInfo>(FALLBACK_CONTACT);

  useEffect(() => {
    let active = true;
    fetch('/api/public/contact-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ContactInfo | null) => {
        if (active && data) setContact(data);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="border-t border-border/60 bg-card/40">
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
            <p className="t-body-sm text-muted-foreground">
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
        <div className="border-t border-border/60 pt-8 mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <p className="t-body-sm text-muted-foreground mb-2">
              CV Babah Digital &middot; Indonesia
            </p>
            <div className="flex flex-wrap items-center gap-4 t-body-sm text-muted-foreground">
              <a href={`mailto:${contact.email}`} className="hover:text-amber-400 transition-colors">
                {contact.email}
              </a>
              {contact.whatsappUrl && contact.whatsappLabel && (
                <>
                  <span aria-hidden="true" className="w-px h-3 bg-border" />
                  <a
                    href={contact.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-400 transition-colors"
                  >
                    {contact.whatsappLabel}
                  </a>
                </>
              )}
              {contact.telegramUrl && (
                <>
                  <span aria-hidden="true" className="w-px h-3 bg-border" />
                  <a
                    href={contact.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-400 transition-colors"
                  >
                    Telegram
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="uppercase tracking-wider font-mono">EN / ID</span>
          </div>
        </div>

        {/* Risk Disclosure */}
        <div className="border-t border-border/60 pt-8 mb-8">
          <div className="max-w-4xl">
            <p className="t-eyebrow text-muted-foreground mb-3">RISK DISCLOSURE</p>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              Trading instrumen finansial mengandung risiko substansial dan dapat mengakibatkan kerugian
              sebagian atau seluruh modal. Kinerja masa lalu tidak menjamin hasil di masa depan.
              BabahAlgo bukan financial advisor. Konsultasikan dengan penasihat keuangan berlisensi
              sebelum mengambil keputusan investasi. Layanan yang disediakan bersifat teknologi
              perdagangan otomatis, bukan rekomendasi investasi.
            </p>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CV Babah Digital. All rights reserved.
          </p>
          {contact.exnessUrl && (
            <p className="text-xs text-muted-foreground">
              Trading via{' '}
              <a
                href={contact.exnessUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="hover:text-amber-400 transition-colors underline underline-offset-2"
              >
                Exness
              </a>{' '}
              &mdash; Regulated Broker Partner
            </p>
          )}
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
