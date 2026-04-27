import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const RISK_LAYERS = [
  { number: 1, nameKey: 'layer_1_name', subtitleKey: 'layer_1_subtitle', descKey: 'layer_1_desc' },
  { number: 2, nameKey: 'layer_2_name', subtitleKey: 'layer_2_subtitle', descKey: 'layer_2_desc' },
  { number: 3, nameKey: 'layer_3_name', subtitleKey: 'layer_3_subtitle', descKey: 'layer_3_desc' },
  { number: 4, nameKey: 'layer_4_name', subtitleKey: 'layer_4_subtitle', descKey: 'layer_4_desc' },
  { number: 5, nameKey: 'layer_5_name', subtitleKey: 'layer_5_subtitle', descKey: 'layer_5_desc' },
  { number: 6, nameKey: 'layer_6_name', subtitleKey: 'layer_6_subtitle', descKey: 'layer_6_desc' },
  { number: 7, nameKey: 'layer_7_name', subtitleKey: 'layer_7_subtitle', descKey: 'layer_7_desc' },
  { number: 8, nameKey: 'layer_8_name', subtitleKey: 'layer_8_subtitle', descKey: 'layer_8_desc' },
  { number: 9, nameKey: 'layer_9_name', subtitleKey: 'layer_9_subtitle', descKey: 'layer_9_desc' },
  { number: 10, nameKey: 'layer_10_name', subtitleKey: 'layer_10_subtitle', descKey: 'layer_10_desc' },
  { number: 11, nameKey: 'layer_11_name', subtitleKey: 'layer_11_subtitle', descKey: 'layer_11_desc' },
  { number: 12, nameKey: 'layer_12_name', subtitleKey: 'layer_12_subtitle', descKey: 'layer_12_desc' },
] as const;

export default async function RiskFrameworkPage() {
  const t = await getTranslations('platform_risk');
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-400/80 transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('back_link')}
            </Link>
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title')}
            </h1>
            <p className="text-foreground/60 leading-relaxed mb-8 max-w-2xl">
              {t('hero_lead')}
            </p>
          </div>
        </section>

        {/* Layers — alternating left-right with connecting line */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('layers_eyebrow')}</p>
            <h2 className="t-display-sub mb-14">{t('layers_title')}</h2>

            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/8 hidden md:block" />

              <div className="space-y-0">
                {RISK_LAYERS.map((layer) => {
                  const isEven = layer.number % 2 === 0;
                  const paddedNum = String(layer.number).padStart(2, '0');

                  return (
                    <div key={layer.number} className="relative md:grid md:grid-cols-2 md:gap-16 py-10 first:pt-0 last:pb-0">
                      {/* Center dot on the line */}
                      <div className="absolute left-1/2 top-10 first:top-0 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-amber-500/40 bg-background z-10 hidden md:block" />

                      {/* Odd: number+title left, description right */}
                      {/* Even: description left, number+title right */}
                      {!isEven ? (
                        <>
                          {/* Left — title block */}
                          <div className="md:text-right md:pr-12">
                            <span className="font-display text-6xl text-amber-500/10 leading-none block mb-2">{paddedNum}</span>
                            <h3 className="font-display text-lg text-foreground mb-1">{t(layer.nameKey)}</h3>
                            <p className="t-body-sm text-amber-400">{t(layer.subtitleKey)}</p>
                          </div>
                          {/* Right — description */}
                          <div className="md:pl-12 mt-4 md:mt-0">
                            <p className="text-foreground/60 leading-relaxed text-sm">{t(layer.descKey)}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Left — description */}
                          <div className="md:text-right md:pr-12 order-2 md:order-1 mt-4 md:mt-0">
                            <p className="text-foreground/60 leading-relaxed text-sm">{t(layer.descKey)}</p>
                          </div>
                          {/* Right — title block */}
                          <div className="md:pl-12 order-1 md:order-2">
                            <span className="font-display text-6xl text-amber-500/10 leading-none block mb-2">{paddedNum}</span>
                            <h3 className="font-display text-lg text-foreground mb-1">{t(layer.nameKey)}</h3>
                            <p className="t-body-sm text-amber-400">{t(layer.subtitleKey)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

      </main>
      <EnterpriseFooter />
    </div>
  );
}
