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
            <h1 className="t-display-page mb-4">Institutional Engagement</h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              For managed accounts, API access, and white-label deployments. Our institutional
              process begins with a confidential briefing to understand your objectives.
            </p>
          </div>
        </section>

        {/* Process steps */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Schedule Briefing', desc: 'Book a 30-minute call with our quant team' },
                { step: '02', title: 'Discovery', desc: 'We assess your requirements, risk parameters, and AUM' },
                { step: '03', title: 'Proposal', desc: 'Custom proposal with fee structure and SLA terms' },
                { step: '04', title: 'Onboarding', desc: 'IMA signing, funding, and infrastructure setup' },
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
                <h3 className="font-display text-lg font-semibold mb-2">Managed Account</h3>
                <p className="t-body-sm text-foreground/60 mb-4">
                  Custom mandate with dedicated risk parameters. Starting AUM $250K.
                </p>
                <p className="font-mono text-amber-400 text-sm">Custom fee structure</p>
              </div>
              <div className="card-enterprise">
                <h3 className="font-display text-lg font-semibold mb-2">API Access</h3>
                <p className="t-body-sm text-foreground/60 mb-4">
                  Integrate BabahAlgo signals and execution into your existing infrastructure.
                </p>
                <p className="font-mono text-amber-400 text-sm">Usage-based pricing</p>
              </div>
              <div className="card-enterprise">
                <h3 className="font-display text-lg font-semibold mb-2">White-Label</h3>
                <p className="t-body-sm text-foreground/60 mb-4">
                  BabahAlgo technology deployed under your brand with custom configuration.
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
