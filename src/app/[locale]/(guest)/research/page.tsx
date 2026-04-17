import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

export const dynamic = 'force-dynamic';

const ARTICLES = [
  {
    slug: 'why-14-instruments',
    tag: 'Strategy',
    title: 'Why we trade 14 instruments and not 50',
    excerpt:
      'Concentration beats diversification when your edge is instrument-specific. We explain why a focused universe produces better risk-adjusted returns than broad coverage.',
    author: 'Abdullah',
    date: 'Mar 2026',
    readTime: '7 min read',
  },
  {
    slug: 'case-against-news-trading',
    tag: 'Execution',
    title: 'The case against news trading',
    excerpt:
      'News events create noise, not signal. Our data shows that systematically avoiding NFP, FOMC, and ECB windows improves Sharpe by 0.3 with no reduction in total return.',
    author: 'Abdullah',
    date: 'Feb 2026',
    readTime: '5 min read',
  },
  {
    slug: 'multi-timeframe-confluence',
    tag: 'Research',
    title: 'Multi-timeframe confluence: a primer',
    excerpt:
      'How we combine H1, H4, and D1 signals into a single trade decision. The mathematics of confluence scoring and why three timeframes outperform one.',
    author: 'Abdullah',
    date: 'Jan 2026',
    readTime: '9 min read',
  },
  {
    slug: 'risk-framework',
    tag: 'Risk',
    title: 'How our 12-layer risk framework actually works',
    excerpt:
      'From position sizing to portfolio heat limits, correlation filters to drawdown circuit breakers. A transparent look at every layer of risk management in our system.',
    author: 'Abdullah',
    date: 'Dec 2025',
    readTime: '12 min read',
  },
  {
    slug: 'backtest-vs-live',
    tag: 'Research',
    title: 'Backtest vs live: what changes',
    excerpt:
      'Slippage, spread variation, execution latency, and requotes. The gap between backtest and live results is real -- here is how we measure and minimize it.',
    author: 'Abdullah',
    date: 'Nov 2025',
    readTime: '8 min read',
  },
  {
    slug: 'choosing-broker-quant',
    tag: 'Operations',
    title: 'Choosing a broker as a quant trader',
    excerpt:
      'Regulation, execution quality, API reliability, and spread consistency matter more than marketing. Our framework for evaluating brokers from a systematic trading perspective.',
    author: 'Abdullah',
    date: 'Oct 2025',
    readTime: '6 min read',
  },
];

export default async function ResearchPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-24">
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Research & Insights
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Notes from the desk on markets, models, and execution.
            </p>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {ARTICLES.map((article) => (
                <article
                  key={article.slug}
                  className="border border-border rounded-lg p-8 bg-card flex flex-col"
                >
                  <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">
                    {article.tag}
                  </p>
                  <h2 className="font-display text-lg font-semibold mb-3 line-clamp-2">
                    {article.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-6 flex-1">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-4 border-t border-border">
                    <span>{article.author}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span>{article.date}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span>{article.readTime}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="font-display text-xl font-semibold mb-3">
                Quarterly research letter
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                No marketing, no spam. Four times a year we share our latest research on strategy development,
                market microstructure, and systematic trading. Unsubscribe anytime.
              </p>
              <form className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="flex-1 border border-border rounded-md px-4 py-3 bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
                <button
                  type="submit"
                  className="bg-accent text-accent-foreground rounded-md px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
                >
                  Subscribe
                </button>
              </form>
              <p className="text-xs text-muted-foreground mt-4">
                By subscribing you agree to our privacy policy. We will never share your email with third parties.
              </p>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
