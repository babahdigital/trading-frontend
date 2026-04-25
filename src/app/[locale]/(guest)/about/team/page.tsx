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
    bio: `Abdullah mendirikan BabahAlgo setelah bertahun-tahun mengembangkan dan menyempurnakan strategi trading kuantitatif untuk pasar forex dan komoditas. Berlatar belakang software engineering dengan minat dalam market microstructure, ia merancang arsitektur strategi inti, risk framework, dan infrastruktur yang menjalankan platform ini. Ia mengawasi langsung pengembangan strategi, operasi sistem, dan hubungan klien institusional. Pendekatannya berakar pada statistical rigor, disiplin operasional, dan transparansi penuh.`,
  },
  {
    name: 'Quantitative Research',
    role: 'Strategy R&D · Backtesting · Validation',
    bio: `Tim quant research bertanggung jawab atas pengembangan strategi baru, backtesting walk-forward, dan validasi out-of-sample. Setiap strategi melewati minimum 3 tahun in-sample + 1 tahun out-of-sample sebelum di-deploy ke production. Tim juga mengelola monitoring strategy decay, regime detection, dan adjustment parameter berbasis Bayesian optimization. Output utama: laporan validasi bulanan dan signal rationale untuk setiap entry.`,
  },
  {
    name: 'Infrastructure & SRE',
    role: 'Platform Reliability · Cloud Operations',
    bio: `Tim infrastructure menjaga uptime 99.95% di seluruh stack — dari MetaTrader 5 execution bridge sub-2ms, Postgres timeseries database, hingga Cloudflare Tunnel ingress. Mereka mengoperasikan playbook insiden lengkap (kill switch protocol, failover MT5, pg backup), monitoring 24/7 dengan alerting, dan runbook deployment untuk setiap perubahan production. Tim juga melakukan audit chain verification harian per ADR governance.`,
  },
  {
    name: 'Client Success & Compliance',
    role: 'Onboarding · KYC · Customer Operations',
    bio: `Customer-facing function yang menangani onboarding KYC institusional, dukungan teknis pelanggan, billing, dan compliance reporting. Tim menjamin setiap PAMM/Signal/Crypto subscriber dilayani sesuai SLA tier-nya. Mereka juga mengelola review berkala dengan klien dedicated mandate dan menjadi kontak utama untuk audit eksternal serta query regulator.`,
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
        <section className="section-padding border-b border-border/60">
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
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">The People</p>
            <div className="grid md:grid-cols-2 gap-8">
              {team.map((member) => (
                <div key={member.name} className="card-enterprise">
                  <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-6">
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
