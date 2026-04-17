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
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="font-display text-display-lg text-foreground mb-4">
          Institutional Engagement
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-12">
          For managed accounts, API access, and white-label deployments. Our institutional
          process begins with a confidential briefing to understand your objectives.
        </p>

        {/* Process steps */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {[
            { step: '01', title: 'Schedule Briefing', desc: 'Book a 30-minute call with our quant team' },
            { step: '02', title: 'Discovery', desc: 'We assess your requirements, risk parameters, and AUM' },
            { step: '03', title: 'Proposal', desc: 'Custom proposal with fee structure and SLA terms' },
            { step: '04', title: 'Onboarding', desc: 'IMA signing, funding, and infrastructure setup' },
          ].map((item) => (
            <div key={item.step} className="border border-border rounded-lg p-6 bg-card">
              <div className="font-mono text-accent text-sm mb-3">{item.step}</div>
              <h3 className="font-display text-sm font-semibold mb-2">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Engagement Models */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-6">Engagement models</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-border rounded-lg p-6 bg-card">
              <h3 className="font-display text-lg font-semibold mb-2">Managed Account</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Custom mandate with dedicated risk parameters. Starting AUM $250K.
              </p>
              <p className="font-mono text-accent text-sm">Custom fee structure</p>
            </div>
            <div className="border border-border rounded-lg p-6 bg-card">
              <h3 className="font-display text-lg font-semibold mb-2">API Access</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Integrate BabahAlgo signals and execution into your existing infrastructure.
              </p>
              <p className="font-mono text-accent text-sm">Usage-based pricing</p>
            </div>
            <div className="border border-border rounded-lg p-6 bg-card">
              <h3 className="font-display text-lg font-semibold mb-2">White-Label</h3>
              <p className="text-sm text-muted-foreground mb-4">
                BabahAlgo technology deployed under your brand with custom configuration.
              </p>
              <p className="font-mono text-accent text-sm">Annual license</p>
            </div>
          </div>
        </section>

        {/* Schedule Call */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-2">Schedule your briefing</h2>
          <p className="text-sm text-muted-foreground mb-8">
            All institutional conversations are confidential. NDA available upon request.
          </p>
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <CalEmbed calLink="babahalgo/institutional" />
          </div>
        </section>

        {/* Alternative: Contact directly */}
        <section className="border-t border-border pt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Prefer to reach us directly?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors text-sm"
          >
            Contact page
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
