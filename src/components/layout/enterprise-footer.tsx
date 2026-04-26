'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';

type LocaleStr = { id: string; en: string };

const FOOTER_LINKS: Record<string, Array<{ href: string; label: LocaleStr }>> = {
  platform: [
    { href: '/platform', label: { id: 'Overview', en: 'Overview' } },
    { href: '/platform/strategies/smc', label: { id: 'Strategi', en: 'Strategies' } },
    { href: '/platform/technology', label: { id: 'Teknologi', en: 'Technology' } },
    { href: '/platform/risk-framework', label: { id: 'Risk Framework', en: 'Risk Framework' } },
    { href: '/performance', label: { id: 'Performa', en: 'Performance' } },
  ],
  solutions: [
    { href: '/solutions/signal', label: { id: 'Robot Forex', en: 'Forex Robot' } },
    { href: '/solutions/crypto', label: { id: 'Robot Crypto', en: 'Crypto Robot' } },
    { href: '/solutions/license', label: { id: 'VPS License', en: 'VPS License' } },
    { href: '/pricing#apis', label: { id: 'Public API', en: 'Public API' } },
    { href: '/demo', label: { id: 'Coba Demo (Gratis)', en: 'Try Demo (Free)' } },
  ],
  getStarted: [
    { href: '/register/signal', label: { id: 'Daftar Forex', en: 'Sign up for Forex' } },
    { href: '/register/crypto', label: { id: 'Daftar Crypto', en: 'Sign up for Crypto' } },
    { href: '/register/vps', label: { id: 'Daftar VPS License', en: 'Sign up for VPS License' } },
    { href: '/register/institutional', label: { id: 'Permintaan Institusional', en: 'Institutional Inquiry' } },
    { href: '/contact', label: { id: 'Jadwalkan Briefing', en: 'Schedule Briefing' } },
  ],
  company: [
    { href: '/about', label: { id: 'Tentang Kami', en: 'About' } },
    { href: '/about/team', label: { id: 'Tim', en: 'Team' } },
    { href: '/about/governance', label: { id: 'Tata Kelola', en: 'Governance' } },
    { href: '/research', label: { id: 'Riset', en: 'Research' } },
    { href: '/changelog', label: { id: 'Changelog', en: 'Changelog' } },
    { href: '/status', label: { id: 'Status', en: 'Status' } },
    { href: '/contact', label: { id: 'Kontak', en: 'Contact' } },
  ],
  legal: [
    { href: '/legal/terms', label: { id: 'Syarat Layanan', en: 'Terms of Service' } },
    { href: '/legal/privacy', label: { id: 'Kebijakan Privasi', en: 'Privacy Policy' } },
    { href: '/legal/risk-disclosure', label: { id: 'Pernyataan Risiko', en: 'Risk Disclosure' } },
    { href: '/legal/regulatory', label: { id: 'Regulasi', en: 'Regulatory' } },
    { href: '/legal/cookies', label: { id: 'Cookies', en: 'Cookies' } },
  ],
};

const COLUMN_TITLES: Record<string, LocaleStr> = {
  platform: { id: 'Platform', en: 'Platform' },
  solutions: { id: 'Layanan', en: 'Solutions' },
  getStarted: { id: 'Mulai', en: 'Get Started' },
  company: { id: 'Perusahaan', en: 'Company' },
  legal: { id: 'Legal', en: 'Legal' },
};

const RISK_COPY: LocaleStr = {
  id: 'Trading instrumen finansial mengandung risiko substansial dan dapat mengakibatkan kerugian sebagian atau seluruh modal. Kinerja masa lalu tidak menjamin hasil di masa depan. BabahAlgo bukan financial advisor. Konsultasikan dengan penasihat keuangan berlisensi sebelum mengambil keputusan investasi. Layanan yang disediakan bersifat teknologi perdagangan otomatis, bukan rekomendasi investasi.',
  en: 'Trading financial instruments involves substantial risk and may result in partial or total loss of capital. Past performance does not guarantee future results. BabahAlgo is not a financial advisor. Consult a licensed financial advisor before making investment decisions. Our services are automated trading technology, not investment recommendations.',
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
  const localeRaw = useLocale();
  const locale: 'id' | 'en' = localeRaw === 'en' ? 'en' : 'id';

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
      <div className="container-default px-4 sm:px-6 pt-20 pb-8">
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
              {locale === 'id' ? (
                <>Inteligensi Otonom.<br />Presisi Institusional.</>
              ) : (
                <>Autonomous Intelligence.<br />Institutional Precision.</>
              )}
            </p>
            <p className="t-body-sm text-muted-foreground">
              {locale === 'id' ? (
                <>Infrastruktur trading kuantitatif.<br />Dioperasikan oleh CV Babah Digital.</>
              ) : (
                <>Quantitative trading infrastructure.<br />Operated by CV Babah Digital.</>
              )}
            </p>
          </div>

          {/* Links — locale-aware */}
          <FooterColumn title={COLUMN_TITLES.platform[locale]} links={FOOTER_LINKS.platform} locale={locale} />
          <FooterColumn title={COLUMN_TITLES.solutions[locale]} links={FOOTER_LINKS.solutions} locale={locale} />
          <FooterColumn title={COLUMN_TITLES.getStarted[locale]} links={FOOTER_LINKS.getStarted} locale={locale} />
          <FooterColumn title={COLUMN_TITLES.company[locale]} links={FOOTER_LINKS.company} locale={locale} />
          <FooterColumn title={COLUMN_TITLES.legal[locale]} links={FOOTER_LINKS.legal} locale={locale} />
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
            <p className="t-eyebrow text-muted-foreground mb-3">
              {locale === 'id' ? 'PERNYATAAN RISIKO' : 'RISK DISCLOSURE'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              {RISK_COPY[locale]}
            </p>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CV Babah Digital. {locale === 'id' ? 'Hak cipta dilindungi.' : 'All rights reserved.'}
          </p>
          {contact.exnessUrl && (
            <p className="text-xs text-muted-foreground">
              {locale === 'id' ? 'Trading via' : 'Trading via'}{' '}
              <a
                href={contact.exnessUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="hover:text-amber-400 transition-colors underline underline-offset-2"
              >
                Exness
              </a>{' '}
              &mdash; {locale === 'id' ? 'Mitra Broker Teregulasi' : 'Regulated Broker Partner'}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links, locale }: { title: string; links: Array<{ href: string; label: LocaleStr }>; locale: 'id' | 'en' }) {
  return (
    <div>
      <h4 className="t-eyebrow mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((link, i) => (
          <li key={link.href + link.label[locale] + i}>
            <Link
              href={link.href}
              className="t-body-sm text-foreground/60 hover:text-amber-400 transition-colors"
            >
              {link.label[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
