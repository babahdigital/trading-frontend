import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { CalEmbed } from '@/components/ui/cal-embed';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RegisterInstitutionalPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Register</p>
            <h1 className="t-display-page mb-4">Institutional & B2B Engagement</h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Untuk Public API priority access, white-label deployment, dan Backtest as a Service.
              <strong className="text-amber-300"> BabahAlgo zero-custody</strong> — kami tidak menerima managed account; capital tetap di akun Anda.
              Proses institusional mulai dari briefing confidential untuk memahami objektif Anda.
            </p>
          </div>
        </section>

        {/* Process steps */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Schedule Briefing', desc: 'Book 30-menit call dengan tim engineering kami' },
                { step: '02', title: 'Discovery', desc: 'Kami assess requirement Anda: API tier, integration scope, white-label scope' },
                { step: '03', title: 'Proposal', desc: 'Custom proposal dengan tier API + SLA terms + integration plan' },
                { step: '04', title: 'Onboarding', desc: 'API key issuance, dedicated environment, integration sprint' },
              ].map((item) => (
                <div key={item.step} className="card-enterprise">
                  <div className="font-mono text-amber-400 text-sm mb-3">{item.step}</div>
                  <h3 className="font-display text-sm font-semibold mb-2">{item.title}</h3>
                  <p className="t-body-sm text-foreground/60">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Engagement Models */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <h2 className="t-display-sub mb-6">Engagement models</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card-enterprise">
                <h3 className="font-display text-lg font-semibold mb-2">API Access</h3>
                <p className="t-body-sm text-foreground/60 mb-4">
                  Integrasi 8 Developer API container kami ke infrastruktur Anda — News, Signals, Indicators, Calendar, Market Data, Correlation, Broker Specs, AI Explainability.
                </p>
                <p className="font-mono text-amber-400 text-sm">Custom usage-based pricing</p>
              </div>
              <div className="card-enterprise">
                <h3 className="font-display text-lg font-semibold mb-2">Backtest as a Service</h3>
                <p className="t-body-sm text-foreground/60 mb-4">
                  Walk-forward + Monte Carlo backtesting on-demand. 5y tick data 14 instrumen, parameter optimization, whitelabel report PDF.
                </p>
                <p className="font-mono text-amber-400 text-sm">$99 — $999 / bulan</p>
              </div>
              <div className="card-enterprise">
                <h3 className="font-display text-lg font-semibold mb-2">White-Label</h3>
                <p className="t-body-sm text-foreground/60 mb-4">
                  Teknologi BabahAlgo dengan brand Anda — Anda pegang relasi customer, kami sediakan tech stack lengkap.
                </p>
                <p className="font-mono text-amber-400 text-sm">Annual license</p>
              </div>
            </div>
          </div>
        </section>

        {/* Schedule Call */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <h2 className="t-display-sub mb-2">Schedule your briefing</h2>
            <p className="t-body-sm text-foreground/60 mb-8">
              All institutional conversations are confidential. NDA available upon request.
            </p>
            <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
              <CalEmbed calLink="babahalgo/institutional" />
            </div>
          </div>
        </section>

        {/* Alternative: Contact directly */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center">
            <p className="text-foreground/60 mb-4">Prefer to reach us directly?</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-foreground/50 hover:text-amber-400 transition-colors text-sm"
            >
              Contact page
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}
