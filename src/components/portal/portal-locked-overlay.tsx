'use client';

/**
 * PortalLockedOverlay — institutional locked state untuk authenticated
 * user yang belum punya subscription.
 *
 * Pak Abdullah audit 2026-05-22: "error 403 itu harusnya halaman terkunci
 * agar menciptakan best practice ke user, kalau error begitu kesannya
 * murahan, apa bisa disempurnakan".
 *
 * Strategy:
 *   - useAuth().subscriptionState === 'inactive' → render overlay
 *   - Overlay PREVENT children dari render → zero fetch → zero 403 errors
 *   - Premium amber theme, lock icon, clear CTA "Pilih Paket"
 *   - Locale-aware bilingual content
 *
 * Locked vs Empty State distinction:
 *   - PortalLockedOverlay: full-page block (login terdeteksi, no sub)
 *   - SubscriptionRequiredEmpty: inline component variant (mixed UI)
 */
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Lock, ShoppingBag, ArrowRight, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const I18N = {
  id: {
    eyebrow: 'Akses Terkunci',
    title: 'Pilih Paket untuk Buka Akses Portal',
    subtitle: 'Akun Anda terverifikasi tapi belum berlangganan. Pilih paket untuk unlock dashboard trading real-time, audit signal, kontrol risk, dan notifikasi premium.',
    benefit1: 'Dashboard trading real-time + analytics performance',
    benefit2: 'Audit signal + transparansi 100%',
    benefit3: 'Kill switch + risk controls institusional',
    benefit4: 'Notifikasi Email + Telegram + WhatsApp',
    ctaPrimary: 'Pilih Paket Sekarang',
    ctaSecondary: 'Tanya Tim Sales',
    finePrint: 'Demo gratis 30 hari tersedia · Cancel kapan saja · Tanpa komitmen jangka panjang',
    backLanding: '← Kembali ke halaman utama',
  },
  en: {
    eyebrow: 'Access Locked',
    title: 'Choose a Plan to Unlock Portal Access',
    subtitle: 'Your account is verified but has no active subscription. Choose a plan to unlock the real-time trading dashboard, signal audit, risk controls, and premium notifications.',
    benefit1: 'Real-time trading dashboard + performance analytics',
    benefit2: 'Signal audit + full transparency',
    benefit3: 'Kill switch + institutional risk controls',
    benefit4: 'Email + Telegram + WhatsApp notifications',
    ctaPrimary: 'Choose a Plan',
    ctaSecondary: 'Talk to Sales',
    finePrint: 'Free 30-day demo available · Cancel anytime · No long-term commitment',
    backLanding: '← Back to landing',
  },
};

export function PortalLockedOverlay() {
  const locale = useLocale();
  const isEn = locale === 'en';
  const t = isEn ? I18N.en : I18N.id;

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-8">
      <div className={cn(
        'relative w-full max-w-3xl overflow-hidden rounded-3xl border border-amber-500/20',
        'bg-gradient-to-br from-amber-500/[0.04] via-card to-card/95',
        'shadow-2xl shadow-amber-500/5',
      )}>
        {/* Decorative glow accents */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-amber-500/[0.08] blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(245,181,71,0.05),transparent_60%)]" aria-hidden />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          {/* Lock icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl" aria-hidden />
              <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/40 ring-4 ring-amber-500/[0.08]">
                <Lock className="h-9 w-9 text-amber-500" strokeWidth={2} aria-hidden />
              </div>
            </div>
          </div>

          {/* Eyebrow + Title */}
          <div className="text-center mb-6">
            <div className="text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-bold mb-3 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" aria-hidden />
              {t.eyebrow}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold leading-[1.15] tracking-tight text-foreground mb-3 max-w-2xl mx-auto">
              {t.title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
              {t.subtitle}
            </p>
          </div>

          {/* Benefits grid */}
          <div className="grid sm:grid-cols-2 gap-3 mb-8 max-w-2xl mx-auto">
            {[t.benefit1, t.benefit2, t.benefit3, t.benefit4].map((benefit, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border/40 bg-card/50"
              >
                <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" aria-hidden />
                <span className="text-xs sm:text-sm text-foreground/85 leading-snug">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center max-w-md mx-auto mb-5">
            <Link
              href="/pricing"
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl',
                'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300',
                'px-6 py-3.5 text-sm font-bold text-amber-950',
                'shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 transition-all',
                'hover:scale-[1.02] active:scale-[0.98]',
              )}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              {t.ctaPrimary}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/contact"
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl',
                'border border-border bg-card/60 hover:bg-card hover:border-border/80',
                'px-6 py-3.5 text-sm font-medium text-foreground/85 hover:text-foreground transition-colors',
              )}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t.ctaSecondary}
            </Link>
          </div>

          {/* Fine print */}
          <p className="text-center text-[11px] text-muted-foreground/70 leading-relaxed max-w-xl mx-auto">
            {t.finePrint}
          </p>

          {/* Back link */}
          <div className="text-center mt-6 pt-6 border-t border-border/40">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.backLanding}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
