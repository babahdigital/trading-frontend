'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';

const TEAM_FALLBACK = [
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

interface TeamMember {
  name: string;
  role: string;
  bio: string;
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>(TEAM_FALLBACK);

  useEffect(() => {
    async function loadCms() {
      try {
        const res = await fetch('/api/public/pages?slug=about-team');
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.sections) && data.sections.length > 0) {
          const members: TeamMember[] = data.sections
            .filter((s: Record<string, unknown>) => s.name && s.role)
            .map((s: Record<string, unknown>) => ({
              name: (s.name as string) || '',
              role: (s.role as string) || '',
              bio: (s.bio as string) || (s.description as string) || '',
            }));
          if (members.length > 0) {
            setTeam(members);
          }
        }
      } catch {
        // keep fallback
      }
    }
    loadCms();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <Link
              href="/about"
              className="t-body-sm text-foreground/60 hover:text-foreground transition-colors mb-4 inline-block"
            >
              About
            </Link>
            <p className="t-eyebrow mb-4">Who We Are</p>
            <h1 className="t-display-page mb-6">
              Our Team
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              A small team focused on execution quality over headcount.
            </p>
          </div>
        </section>

        {/* Team Grid */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">The People</p>
            <div className="grid md:grid-cols-2 gap-8">
              {team.map((member) => (
                <div key={member.name} className="card-enterprise">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <span className="font-mono text-lg text-foreground/50">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <h2 className="text-xl font-medium mb-1">{member.name}</h2>
                  <p className="t-body-sm font-mono text-foreground/60 mb-4">{member.role}</p>
                  <p className="t-body-sm text-foreground/60 leading-relaxed">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Note */}
        <section className="section-padding">
          <div className="container-default px-6">
            <div className="max-w-2xl">
              <p className="text-foreground/60 leading-relaxed">
                We are a small team by design. In quantitative trading, the quality of decisions matters
                far more than the number of people making them. Every member of the team has direct
                operational responsibility and deep context on every aspect of the system. This structure
                allows us to move quickly, maintain consistency, and keep overhead low -- savings that are
                passed directly to our clients through competitive fee structures.
              </p>
              <div className="mt-8">
                <Link
                  href="/contact"
                  className="btn-secondary inline-flex items-center gap-2"
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
