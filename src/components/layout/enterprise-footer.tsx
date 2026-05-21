'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { RegionPreferences } from '@/components/layout/region-preferences';
import { NewsletterForm } from '@/components/layout/newsletter-form';
import { cn } from '@/lib/utils';

type LocaleStr = { id: string; en: string };

// Footer link structure — designed untuk hindari redundansi (sebelumnya
// "Get Started" column duplicate /contact + /register links yang udah ada di
// main nav). Sekarang 5 kolom semantic distinct: Platform, Solutions, Resources,
// Company, Legal. Setiap link unik (no duplicate destination).
const FOOTER_LINKS: Record<string, Array<{ href: string; label: LocaleStr }>> = {
  platform: [
    { href: '/platform', label: { id: 'Overview', en: 'Overview' } },
    { href: '/platform/strategies', label: { id: 'Strategi', en: 'Strategies' } },
    { href: '/platform/technology', label: { id: 'Teknologi', en: 'Technology' } },
    { href: '/platform/risk-framework', label: { id: 'Risk Framework', en: 'Risk Framework' } },
    { href: '/platform/execution', label: { id: 'Eksekusi', en: 'Execution' } },
    { href: '/platform/instruments', label: { id: 'Instrumen', en: 'Instruments' } },
  ],
  solutions: [
    { href: '/solutions/signal', label: { id: 'Robot Forex', en: 'Forex Robot' } },
    { href: '/solutions/crypto', label: { id: 'Robot Crypto', en: 'Crypto Robot' } },
    { href: '/solutions/license', label: { id: 'Software License', en: 'Software License' } },
    { href: '/solutions/institutional', label: { id: 'Institutional / B2B', en: 'Institutional / B2B' } },
    { href: '/register', label: { id: 'Daftar', en: 'Sign up' } },
  ],
  resources: [
    { href: '/pricing', label: { id: 'Harga', en: 'Pricing' } },
    { href: '/performance', label: { id: 'Performa', en: 'Performance' } },
    { href: '/research', label: { id: 'Riset', en: 'Research' } },
    { href: '/demo', label: { id: 'Demo Gratis', en: 'Free Demo' } },
    { href: '/changelog', label: { id: 'Changelog', en: 'Changelog' } },
    { href: '/status', label: { id: 'Status', en: 'Status' } },
  ],
  company: [
    { href: '/about', label: { id: 'Tentang Kami', en: 'About' } },
    { href: '/about/team', label: { id: 'Tim', en: 'Team' } },
    { href: '/about/governance', label: { id: 'Tata Kelola', en: 'Governance' } },
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
  resources: { id: 'Resources', en: 'Resources' },
  company: { id: 'Perusahaan', en: 'Company' },
  legal: { id: 'Legal', en: 'Legal' },
};

const RISK_COPY: LocaleStr = {
  id: 'BabahAlgo adalah software algorithmic trading yang dilisensikan oleh CV Babah Digital. Kami bukan Penasihat Berjangka, bukan Pialang Berjangka, dan tidak terdaftar sebagai Penasihat Investasi di OJK. Kami tidak custody dana, tidak manage trading atas nama klien, dan tidak memberi rekomendasi investasi spesifik. Trading instrumen finansial mengandung risiko substansial dan dapat mengakibatkan kerugian sebagian atau seluruh modal. Kinerja masa lalu tidak menjamin hasil di masa depan. Subscriber bertanggung jawab penuh atas risiko trading dan kepatuhan regulator di yurisdiksi masing-masing.',
  en: 'BabahAlgo is algorithmic trading software licensed by CV Babah Digital. We are not a registered Investment Advisor, Futures Adviser, or Futures Broker in Indonesia (or in any other jurisdiction unless explicitly stated). We do not custody funds, do not manage trading on the client\'s behalf, and do not provide specific investment recommendations. Trading financial instruments involves substantial risk and may result in partial or total loss of capital. Past performance does not guarantee future results. Subscribers are fully responsible for their own trading risk and regulatory compliance in their respective jurisdictions.',
};

interface ContactInfo {
  email: string;
  whatsappUrl: string | null;
  whatsappLabel: string | null;
  telegramUrl: string | null;
}

const FALLBACK_CONTACT: ContactInfo = {
  email: 'hello@babahalgo.com',
  whatsappUrl: 'https://wa.me/6281234567890',
  whatsappLabel: 'WhatsApp',
  telegramUrl: 'https://t.me/babahalgo',
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
    <footer id="enterprise-footer" className="border-t border-border/60 bg-card/40">
      <div className="layout-container pt-12 sm:pt-16 pb-8">
        {/* Subscribe band — prominent full-width banner di atas link columns.
            Sebelumnya newsletter tersembunyi di brand column kecil; sekarang
            jadi CTA jelas dengan headline + form berdampingan di desktop. */}
        <div className="mb-12 sm:mb-14 rounded-2xl border border-border/70 bg-gradient-to-br from-amber-500/[0.04] via-card/40 to-card/40 dark:from-amber-500/[0.06] dark:via-[var(--brand-midnight-2)] dark:to-[var(--brand-midnight-2)] px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-5">
              <p className="t-eyebrow mb-3">{locale === 'id' ? 'Riset Mingguan' : 'Weekly Research'}</p>
              <h3 className="font-display text-2xl sm:text-3xl text-foreground leading-tight mb-2">
                {locale === 'id' ? 'Insight pasar institusional, langsung ke inbox.' : 'Institutional market insight, straight to your inbox.'}
              </h3>
              <p className="t-body-sm text-muted-foreground max-w-md">
                {locale === 'id'
                  ? 'Brief mingguan tentang strategi, risiko, dan eksekusi. Tanpa marketing, tanpa spam — berhenti kapan saja.'
                  : 'Weekly briefings on strategy, risk, and execution. No marketing, no spam — unsubscribe anytime.'}
              </p>
            </div>
            <div className="lg:col-span-7">
              <NewsletterForm locale={locale} />
            </div>
          </div>
        </div>

        {/* Top section — Brand + Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-8 mb-12 sm:mb-16">
          {/* Brand column */}
          <div className="col-span-2">
            <Image
              src="/logo/babahalgo-footer-dark.png"
              alt="BabahAlgo"
              width={240}
              height={48}
              className="h-9 w-auto mb-6 hidden dark:block"
            />
            <Image
              src="/logo/babahalgo-footer-light.png"
              alt="BabahAlgo"
              width={240}
              height={48}
              className="h-9 w-auto mb-6 dark:hidden"
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

          {/* Links — locale-aware, distinct destination per row (no redundant linking) */}
          <FooterColumn title={COLUMN_TITLES.platform[locale]} links={FOOTER_LINKS.platform} locale={locale} />
          <FooterColumn title={COLUMN_TITLES.solutions[locale]} links={FOOTER_LINKS.solutions} locale={locale} />
          <FooterColumn title={COLUMN_TITLES.resources[locale]} links={FOOTER_LINKS.resources} locale={locale} />
          <FooterColumn title={COLUMN_TITLES.company[locale]} links={FOOTER_LINKS.company} locale={locale} />
          <FooterColumn title={COLUMN_TITLES.legal[locale]} links={FOOTER_LINKS.legal} locale={locale} />
        </div>

        {/* Legal entity + Contact */}
        <div className="border-t border-border/60 pt-8 mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <p className="t-body-sm text-muted-foreground mb-2">
              CV Babah Digital &middot; Indonesia
            </p>
            <FooterContactIcons contact={contact} locale={locale} />
          </div>
          <div className="flex items-center gap-3">
            <RegionPreferences variant="full" />
          </div>
        </div>

        {/* Risk Disclosure */}
        <div className="border-t border-border/60 pt-8 mb-8">
          <div className="max-w-4xl">
            <p className="t-eyebrow text-muted-foreground mb-3">
              {locale === 'id' ? 'PERNYATAAN RISIKO' : 'RISK DISCLOSURE'}
            </p>
            <p className="text-xs text-amber-200/80 font-semibold mb-3">
              {locale === 'id'
                ? 'Tech provider · Zero-custody · No PAMM · No managed account'
                : 'Tech provider · Zero-custody · No PAMM · No managed account'}
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
          <p className="text-xs text-muted-foreground">
            {locale === 'id'
              ? 'Tech provider · Zero-custody · No referral'
              : 'Tech provider · Zero-custody · No referral'}
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Footer contact row — Pak Abdullah 2026-05-21 ────────────────────────
// Text-based separator-delimited links (Email · WhatsApp · Telegram · Chat AI).
// Chat AI trigger pakai custom event `babahalgo:open-chat` — ChatWidget listen
// dan auto-open panel sekali klik (no intermediate icon). WhatsApp number set
// admin via /admin/cms/company-settings.

interface FooterContactIconsProps {
  contact: ContactInfo;
  locale: 'id' | 'en';
}

function FooterContactIcons({ contact, locale }: FooterContactIconsProps) {
  const openChat = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('babahalgo:open-chat'));
    }
  }, []);

  const linkClass = 'hover:text-amber-400 transition-colors';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 t-body-sm text-muted-foreground">
      <a href={`mailto:${contact.email}`} className={linkClass}>
        {contact.email}
      </a>
      {contact.whatsappUrl && (
        <>
          <span aria-hidden className="w-px h-3 bg-border" />
          <a
            href={contact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            WhatsApp
          </a>
        </>
      )}
      {contact.telegramUrl && (
        <>
          <span aria-hidden className="w-px h-3 bg-border" />
          <a
            href={contact.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Telegram
          </a>
        </>
      )}
      <span aria-hidden className="w-px h-3 bg-border" />
      <button
        type="button"
        onClick={openChat}
        className={cn(linkClass, 'cursor-pointer text-left')}
        aria-label={locale === 'id' ? 'Buka chat asisten' : 'Open chat assistant'}
      >
        {locale === 'id' ? 'Chat AI' : 'AI Chat'}
      </button>
    </div>
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
