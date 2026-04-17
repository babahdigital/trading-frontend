'use client';

import { useEffect, useState } from 'react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

const ARTICLES_FALLBACK = [
  { slug: 'why-14-instruments', tag: 'Strategy', title: 'Why we trade 14 instruments and not 50', excerpt: 'Concentration beats diversification when your edge is instrument-specific. We explain why a focused universe produces better risk-adjusted returns.', author: 'Abdullah', date: 'Mar 2026', readTime: '7 min read' },
  { slug: 'case-against-news-trading', tag: 'Execution', title: 'The case against news trading', excerpt: 'News events create noise, not signal. Our data shows that avoiding NFP, FOMC, and ECB windows improves Sharpe by 0.3.', author: 'Abdullah', date: 'Feb 2026', readTime: '5 min read' },
  { slug: 'multi-timeframe-confluence', tag: 'Research', title: 'Multi-timeframe confluence: a primer', excerpt: 'How we combine H1, H4, and D1 signals into a single trade decision. The mathematics of confluence scoring.', author: 'Abdullah', date: 'Jan 2026', readTime: '9 min read' },
  { slug: 'risk-framework', tag: 'Risk', title: 'How our 12-layer risk framework actually works', excerpt: 'From position sizing to correlation filters to drawdown circuit breakers. A transparent look at every layer.', author: 'Abdullah', date: 'Dec 2025', readTime: '12 min read' },
  { slug: 'backtest-vs-live', tag: 'Research', title: 'Backtest vs live: what changes', excerpt: 'Slippage, spread variation, execution latency, and requotes. The gap between backtest and live results is real.', author: 'Abdullah', date: 'Nov 2025', readTime: '8 min read' },
  { slug: 'choosing-broker-quant', tag: 'Operations', title: 'Choosing a broker as a quant trader', excerpt: 'Regulation, execution quality, API reliability, and spread consistency. Our framework for evaluating brokers.', author: 'Abdullah', date: 'Oct 2025', readTime: '6 min read' },
];

interface Article {
  slug: string;
  tag?: string;
  category?: string;
  title: string;
  excerpt: string;
  author: string;
  date?: string;
  publishedAt?: string;
  readTime: string | number;
}

export default function ResearchPage() {
  const [articles, setArticles] = useState<Article[]>(ARTICLES_FALLBACK);

  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch('/api/public/articles');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setArticles(
            data.map((a: Record<string, unknown>) => ({
              slug: (a.slug as string) || '',
              tag: (a.category as string) || (a.tag as string) || '',
              title: (a.title as string) || '',
              excerpt: (a.excerpt as string) || '',
              author: (a.author as string) || 'Abdullah',
              date: (a.publishedAt as string) || (a.date as string) || '',
              readTime: typeof a.readTime === 'number' ? `${a.readTime} min read` : (a.readTime as string) || '',
            }))
          );
        }
      } catch {
        // keep fallback
      }
    }
    loadArticles();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Research</p>
            <h1 className="t-display-page mb-6">Research & Insights</h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Notes from the desk on markets, models, and execution.
            </p>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <article
                  key={article.slug}
                  className="card-enterprise flex flex-col group cursor-pointer"
                >
                  <p className="t-eyebrow mb-3">{article.tag}</p>
                  <h2 className="text-lg font-medium mb-3 line-clamp-2 group-hover:text-amber-400 transition-colors">
                    {article.title}
                  </h2>
                  <p className="t-body-sm text-foreground/60 leading-relaxed line-clamp-3 mb-6 flex-1">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-foreground/40 pt-4 border-t border-white/[0.04]">
                    <span>{article.author}</span>
                    <span className="w-1 h-1 rounded-full bg-foreground/20" />
                    <span>{article.date}</span>
                    <span className="w-1 h-1 rounded-full bg-foreground/20" />
                    <span>{typeof article.readTime === 'number' ? `${article.readTime} min read` : article.readTime}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="section-padding">
          <div className="container-default px-6">
            <div className="max-w-xl mx-auto text-center">
              <p className="t-eyebrow mb-3">Stay Informed</p>
              <h2 className="t-display-sub mb-3">Quarterly research letter</h2>
              <p className="t-body-sm text-foreground/60 mb-8">
                No marketing, no spam. Four times a year we share our latest research on strategy development,
                market microstructure, and systematic trading. Unsubscribe anytime.
              </p>
              <form className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="flex-1 border border-white/10 rounded-md px-4 py-3 bg-white/[0.03] text-foreground text-sm font-mono placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-shadow"
                  required
                />
                <button type="submit" className="btn-primary shrink-0 py-3 px-6">
                  Subscribe
                </button>
              </form>
              <p className="text-xs text-foreground/40 mt-4">
                By subscribing you agree to our privacy policy. We will never share your email.
              </p>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
