import { getTranslations } from 'next-intl/server';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import ContactForm from '@/components/forms/contact-form';
import { CalEmbed } from '@/components/ui/cal-embed';
import {
  Mail, MessageCircle, Send, Clock, MapPin,
  CalendarCheck, ShieldCheck, FileSignature, MessagesSquare,
} from 'lucide-react';
import { getPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/contact',
    {
      title: isEn ? 'Contact — BabahAlgo' : 'Kontak — BabahAlgo',
      description: isEn
        ? 'Contact the BabahAlgo team for commercial inquiries, technical support, or institutional collaboration.'
        : 'Hubungi tim BabahAlgo untuk pertanyaan komersial, dukungan teknis, atau kolaborasi institusional.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

const AGENDA_META = [
  { icon: CalendarCheck, titleKey: 'agenda1_title', descKey: 'agenda1_desc' },
  { icon: ShieldCheck, titleKey: 'agenda2_title', descKey: 'agenda2_desc' },
  { icon: FileSignature, titleKey: 'agenda3_title', descKey: 'agenda3_desc' },
  { icon: MessagesSquare, titleKey: 'agenda4_title', descKey: 'agenda4_desc' },
] as const;

export default async function ContactPage() {
  const t = await getTranslations('contact_page');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero — contact uses page-stamp-editorial (warm radial) so the page
            feels welcoming/human after the data-heavy pricing/performance pages */}
        <section className="section-padding border-b border-border/60 page-stamp-editorial">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title_l1')}<br className="hidden sm:block" /> {t('hero_title_l2')}
            </h1>
            <p className="t-lead text-muted-foreground max-w-2xl">
              {t('hero_subtitle')}
            </p>
            <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
              </span>
              {t('hero_pill')}
            </div>
          </div>
        </section>

        {/* What to expect — agenda 4 quadrant */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('agenda_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('agenda_title')}</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              {t('agenda_subtitle')}
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {AGENDA_META.map((item) => (
                <div key={item.titleKey} className="rounded-xl border border-border/80 bg-card p-6 sm:p-7">
                  <div className="icon-container mb-4">
                    <item.icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="font-display text-xl font-medium mb-2">{t(item.titleKey)}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">{t(item.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Schedule a Call */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('schedule_eyebrow')}</p>
            <h2 className="t-display-sub mb-3">{t('schedule_title')}</h2>
            <p className="t-body-sm text-foreground/60 mb-8 max-w-xl">
              {t('schedule_subtitle')}
            </p>
            <div className="card-enterprise p-0 overflow-hidden">
              <CalEmbed calLink="babahalgo/briefing" />
            </div>
          </div>
        </section>

        {/* Two Columns: Form + Direct Channels */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-16 lg:gap-20">
              {/* Left: Contact Form (60%) */}
              <div className="lg:col-span-3">
                <p className="t-eyebrow mb-3">{t('form_eyebrow')}</p>
                <h2 className="t-display-sub mb-3">{t('form_title')}</h2>
                <p className="t-body-sm text-foreground/60 mb-8 max-w-lg">
                  {t('form_subtitle')}
                </p>
                <ContactForm />
              </div>

              {/* Right: Direct Channels (40%) */}
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">{t('channels_eyebrow')}</p>
                <h2 className="t-display-sub mb-3">{t('channels_title')}</h2>
                <p className="t-body-sm text-foreground/60 mb-8">
                  {t('channels_subtitle')}
                </p>
                <div className="space-y-3">
                  <ChannelCard
                    icon={<Mail className="w-5 h-5" />}
                    title={t('channel_general_title')}
                    href="mailto:hello@babahalgo.com"
                    value="hello@babahalgo.com"
                  />
                  <ChannelCard
                    icon={<Mail className="w-5 h-5" />}
                    title={t('channel_ir_title')}
                    href="mailto:ir@babahalgo.com"
                    value="ir@babahalgo.com"
                  />
                  <ChannelCard
                    icon={<MessageCircle className="w-5 h-5" />}
                    title={t('channel_wa_title')}
                    href="https://wa.me/6281234567890"
                    value={t('channel_wa_value')}
                  />
                  <ChannelCard
                    icon={<Send className="w-5 h-5" />}
                    title={t('channel_tg_title')}
                    href="https://t.me/babahalgo"
                    value="@babahalgo"
                  />

                  <div className="border-t border-border/60 mt-6 pt-6 space-y-5">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium mb-1">{t('ops_label')}</p>
                        <p className="text-sm text-foreground/65">{t('ops_value')}</p>
                        <p className="text-xs text-foreground/50 mt-0.5">
                          {t('ops_note')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium mb-1">{t('response_label')}</p>
                        <p className="text-xs text-foreground/55 leading-relaxed">
                          {t('response_body_part1')} <span className="font-mono text-amber-400">[URGENT]</span> {t('response_body_part2')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}

function ChannelCard({ icon, title, href, value }: { icon: React.ReactNode; title: string; href: string; value: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="flex items-center gap-4 p-4 rounded-lg border border-border/60 bg-card hover:border-amber-500/30 transition-all group"
    >
      <div className="icon-container shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium group-hover:text-amber-400 transition-colors truncate">{title}</p>
        <p className="text-xs text-foreground/50 font-mono mt-0.5 truncate">{value}</p>
      </div>
    </a>
  );
}
