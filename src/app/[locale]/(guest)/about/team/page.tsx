'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
}

const MEMBER_KEYS = [
  { nameKey: 'member1_name', roleKey: 'member1_role', bioKey: 'member1_bio' },
  { nameKey: 'member2_name', roleKey: 'member2_role', bioKey: 'member2_bio' },
  { nameKey: 'member3_name', roleKey: 'member3_role', bioKey: 'member3_bio' },
  { nameKey: 'member4_name', roleKey: 'member4_role', bioKey: 'member4_bio' },
] as const;

export default function TeamPage() {
  const t = useTranslations('about_team_page');
  const teamFromI18n: TeamMember[] = MEMBER_KEYS.map((m) => ({
    name: t(m.nameKey),
    role: t(m.roleKey),
    bio: t(m.bioKey),
  }));
  const [team, setTeam] = useState<TeamMember[]>(teamFromI18n);

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
        // keep i18n fallback
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
          <div className="container-default px-4 sm:px-6">
            <Link
              href="/about"
              className="t-body-sm text-foreground/60 hover:text-foreground transition-colors mb-4 inline-block"
            >
              {t('back_link')}
            </Link>
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title')}
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              {t('hero_subtitle')}
            </p>
          </div>
        </section>

        {/* Team Grid */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('members_eyebrow')}</p>
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
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-foreground/60 leading-relaxed">
                {t('note')}
              </p>
              <div className="mt-8">
                <Link
                  href="/contact"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  {t('cta_link')}
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
