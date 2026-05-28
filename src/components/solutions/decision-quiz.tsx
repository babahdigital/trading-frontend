'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, RotateCcw, TrendingUp, Server, Building2, Bitcoin } from 'lucide-react';

/**
 * Decision quiz — 3 pertanyaan auto-routing user ke product yang tepat.
 *
 * Logic decision tree:
 *   Q1. Asset class? → forex/metals (Robot Meta family) vs crypto (Robot Crypto)
 *   Q2. Modal trading? → < 800jt = retail SaaS, 800jt-3M = VPS License, 3M+ = Institutional
 *   Q3. Seberapa technical? → DIY (License Only), partial (Hybrid), no infra (Turnkey)
 *
 * Output: rekomendasi product dengan reasoning + link langsung ke detail page.
 * Reset button supaya user bisa retake quiz dengan jawaban berbeda.
 */
type Answers = {
  asset?: 'forex' | 'crypto';
  capital?: 'small' | 'medium' | 'large';
  technical?: 'diy' | 'partial' | 'none';
};

type Recommendation = {
  productKey: string;
  href: string;
  icon: typeof TrendingUp;
  accent: 'amber' | 'sky' | 'emerald' | 'violet';
  reasonKey: string;
  setupKey: string;
};

function recommend(answers: Answers): Recommendation | null {
  if (!answers.asset || !answers.capital) return null;

  // Crypto branch — single product line, capital-tier driven via /pricing
  if (answers.asset === 'crypto') {
    return {
      productKey: 'rec_crypto_product',
      href: '/solutions/crypto',
      icon: Bitcoin,
      accent: 'violet',
      reasonKey: 'rec_crypto_reason',
      setupKey: 'rec_crypto_setup',
    };
  }

  // Forex/Metals branch — by capital + technical preference
  if (answers.capital === 'small') {
    return {
      productKey: 'rec_retail_product',
      href: '/solutions/signal',
      icon: TrendingUp,
      accent: 'amber',
      reasonKey: 'rec_retail_reason',
      setupKey: 'rec_retail_setup',
    };
  }

  if (answers.capital === 'large') {
    return {
      productKey: 'rec_inst_product',
      href: '/solutions/institutional',
      icon: Building2,
      accent: 'emerald',
      reasonKey: 'rec_inst_reason',
      setupKey: 'rec_inst_setup',
    };
  }

  // Capital medium = VPS License — pick tier sesuai technical preference
  if (!answers.technical) return null;
  const tier =
    answers.technical === 'diy' ? 'rec_vps_license_only' :
    answers.technical === 'partial' ? 'rec_vps_hybrid' :
    'rec_vps_turnkey';
  return {
    productKey: 'rec_vps_product',
    href: '/solutions/license',
    icon: Server,
    accent: 'sky',
    reasonKey: `${tier}_reason`,
    setupKey: `${tier}_setup`,
  };
}

export function DecisionQuiz() {
  const t = useTranslations('decision_quiz');
  const [answers, setAnswers] = useState<Answers>({});

  const showQ3 = answers.asset === 'forex' && answers.capital === 'medium';
  const result = useMemo(() => {
    // Q3 hanya muncul kalau forex + medium capital — kalau tidak, skip Q3
    if (answers.asset === 'forex' && answers.capital === 'medium' && !answers.technical) return null;
    return recommend(answers);
  }, [answers]);

  const reset = () => setAnswers({});

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-6 sm:p-8 lg:p-10">
      <div className="text-center mb-8 sm:mb-10 max-w-2xl mx-auto">
        <p className="t-eyebrow mb-3">{t('eyebrow')}</p>
        <h2 className="t-display-sub mb-3">{t('title')}</h2>
        <p className="t-body-sm text-foreground/60 leading-relaxed">{t('subtitle')}</p>
      </div>

      <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto">
        {/* Q1 — Asset class */}
        <QuizQuestion
          number="01"
          label={t('q1_label')}
          options={[
            { value: 'forex', label: t('q1_opt_forex'), desc: t('q1_opt_forex_desc') },
            { value: 'crypto', label: t('q1_opt_crypto'), desc: t('q1_opt_crypto_desc') },
          ]}
          selected={answers.asset}
          onSelect={(v) => setAnswers({ asset: v as 'forex' | 'crypto' })}
        />

        {/* Q2 — Capital range (forex branch only — crypto goes direct) */}
        {answers.asset === 'forex' && (
          <QuizQuestion
            number="02"
            label={t('q2_label')}
            options={[
              { value: 'small', label: t('q2_opt_small'), desc: t('q2_opt_small_desc') },
              { value: 'medium', label: t('q2_opt_medium'), desc: t('q2_opt_medium_desc') },
              { value: 'large', label: t('q2_opt_large'), desc: t('q2_opt_large_desc') },
            ]}
            selected={answers.capital}
            onSelect={(v) => setAnswers((a) => ({ ...a, capital: v as 'small' | 'medium' | 'large', technical: undefined }))}
          />
        )}

        {/* Q3 — Technical comfort (VPS License medium-capital branch only) */}
        {showQ3 && (
          <QuizQuestion
            number="03"
            label={t('q3_label')}
            options={[
              { value: 'diy', label: t('q3_opt_diy'), desc: t('q3_opt_diy_desc') },
              { value: 'partial', label: t('q3_opt_partial'), desc: t('q3_opt_partial_desc') },
              { value: 'none', label: t('q3_opt_none'), desc: t('q3_opt_none_desc') },
            ]}
            selected={answers.technical}
            onSelect={(v) => setAnswers((a) => ({ ...a, technical: v as 'diy' | 'partial' | 'none' }))}
          />
        )}

        {/* Recommendation card */}
        {result && (
          <RecommendationCard recommendation={result} t={t} onReset={reset} />
        )}
      </div>
    </div>
  );
}

function QuizQuestion({
  number,
  label,
  options,
  selected,
  onSelect,
}: {
  number: string;
  label: string;
  options: Array<{ value: string; label: string; desc: string }>;
  selected?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <span className="font-mono text-2xl text-amber-500/40 leading-none mt-1">{number}</span>
        <h3 className="font-display text-lg sm:text-xl font-medium">{label}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-0 sm:pl-12">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`text-left rounded-lg border-2 p-4 transition-all ${
              selected === opt.value
                ? 'border-amber-500/60 bg-amber-500/[0.06]'
                : 'border-border/60 bg-card hover:border-amber-500/30'
            }`}
          >
            <p className="font-medium text-sm mb-1.5">{opt.label}</p>
            <p className="text-xs text-foreground/60 leading-relaxed">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  t,
  onReset,
}: {
  recommendation: Recommendation;
  t: ReturnType<typeof useTranslations>;
  onReset: () => void;
}) {
  const Icon = recommendation.icon;
  const accentBg =
    recommendation.accent === 'amber' ? 'bg-amber-500/15 border-amber-500/40' :
    recommendation.accent === 'sky' ? 'bg-sky-500/15 border-sky-500/40' :
    recommendation.accent === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/40' :
    'bg-violet-500/15 border-violet-500/40';
  const accentText =
    recommendation.accent === 'amber' ? 'text-amber-300' :
    recommendation.accent === 'sky' ? 'text-sky-300' :
    recommendation.accent === 'emerald' ? 'text-emerald-300' :
    'text-violet-300';

  return (
    <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/[0.04] p-6 sm:p-8 mt-8">
      <p className="t-eyebrow text-amber-400 mb-4">{t('result_eyebrow')}</p>
      <div className="flex items-start gap-4 mb-5">
        <span className={`inline-flex h-12 w-12 rounded-lg ${accentBg} border items-center justify-center shrink-0`}>
          <Icon className={`h-6 w-6 ${accentText}`} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-2xl font-medium mb-2">{t(recommendation.productKey as 'rec_crypto_product')}</h3>
          <p className="text-sm text-foreground/70 leading-relaxed mb-3">
            {t(recommendation.reasonKey as 'rec_retail_reason')}
          </p>
          <p className="text-xs font-mono text-foreground/50">
            {t(recommendation.setupKey as 'rec_retail_setup')}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={recommendation.href}
          className="btn-primary inline-flex items-center justify-center gap-2"
        >
          {t('result_cta')} <ArrowRight className="w-4 h-4" />
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium border border-border/60 hover:border-amber-500/40 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> {t('result_retake')}
        </button>
      </div>
    </div>
  );
}
