'use client';

import { useEffect, useState } from 'react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { cn } from '@/lib/utils';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  title_en: string | null;
  body: string;
  body_en: string | null;
  category: 'FEATURE' | 'IMPROVEMENT' | 'FIX' | 'SECURITY' | 'BREAKING';
  releasedAt: string;
}

const CATEGORY_STYLES: Record<ChangelogEntry['category'], string> = {
  FEATURE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  IMPROVEMENT: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  FIX: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  SECURITY: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  BREAKING: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/changelog')
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">What&apos;s new</p>
            <h1 className="t-display-page mb-6">Changelog</h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Rilis, perbaikan, dan pembaruan platform. Kami mencatat setiap perubahan agar Anda
              tahu persis apa yang terjadi di belakang layar.
            </p>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-default px-6">
            {loading && (
              <p className="text-foreground/50">Loading…</p>
            )}
            {!loading && entries.length === 0 && (
              <div className="card-enterprise p-8 text-center">
                <p className="text-foreground/70">Belum ada entri changelog yang dipublikasikan.</p>
                <p className="text-foreground/50 text-sm mt-2">Tim kami akan mempublikasikan rilisan mendatang di sini.</p>
              </div>
            )}
            <div className="space-y-8">
              {entries.map((e) => (
                <article key={e.id} className="card-enterprise p-6 md:p-8">
                  <header className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="font-mono text-sm text-amber-400">v{e.version}</span>
                    <span className={cn('text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded border', CATEGORY_STYLES[e.category])}>
                      {e.category}
                    </span>
                    <time className="text-xs text-foreground/50 ml-auto" dateTime={e.releasedAt}>
                      {new Date(e.releasedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </time>
                  </header>
                  <h2 className="text-xl font-semibold mb-3">{e.title}</h2>
                  <div className="prose prose-invert prose-sm max-w-none text-foreground/80 whitespace-pre-wrap">
                    {e.body}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
