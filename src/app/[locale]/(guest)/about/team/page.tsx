import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const TEAM = [
  {
    name: 'Abdullah',
    role: 'Founder & Lead Quant',
    bio: `Abdullah founded BabahAlgo after spending years developing and refining quantitative trading strategies across forex and commodities markets. With a background in software engineering and a deep interest in market microstructure, he designed the core strategy architecture, risk framework, and infrastructure that power the platform. He personally oversees all strategy development, system operations, and client relationships. His approach to trading is rooted in statistical rigor, operational discipline, and radical transparency.`,
  },
  {
    name: 'Operations Team',
    role: 'Infrastructure & Client Operations',
    bio: `Our operations team handles the day-to-day infrastructure management, monitoring, and client support that keeps BabahAlgo running around the clock. From server health monitoring during Asian session opens to onboarding new PAMM clients, the operations function ensures that every component of the system performs as designed. The team follows strict runbooks for incident response, deployment procedures, and client communication.`,
  },
];

export default async function TeamPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-24">
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
            >
              About
            </Link>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Our Team
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              A small team focused on execution quality over headcount.
            </p>
          </div>
        </section>

        {/* Team Grid */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="grid md:grid-cols-2 gap-8">
              {TEAM.map((member) => (
                <div key={member.name} className="border border-border rounded-lg p-8 bg-card">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                    <span className="font-mono text-lg text-muted-foreground">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <h2 className="font-display text-xl font-semibold mb-1">{member.name}</h2>
                  <p className="text-sm font-mono text-muted-foreground mb-4">{member.role}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Note */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="max-w-2xl">
              <p className="text-muted-foreground leading-relaxed">
                We are a small team by design. In quantitative trading, the quality of decisions matters
                far more than the number of people making them. Every member of the team has direct
                operational responsibility and deep context on every aspect of the system. This structure
                allows us to move quickly, maintain consistency, and keep overhead low -- savings that are
                passed directly to our clients through competitive fee structures.
              </p>
              <div className="mt-8">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 border border-border rounded-md px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Get in touch
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
