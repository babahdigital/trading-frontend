'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShowcaseSlide {
  eyebrow: string;
  title: string;
  description: string;
  /** Big numeric or short label rendered on the right column. */
  metric: string;
  metricLabel: string;
  /** Optional CTA — omit both fields to render slide without action button. */
  ctaLabel?: string;
  ctaHref?: string;
}

interface EditorialShowcaseProps {
  /** Section heading shown above the slides. */
  eyebrow: string;
  title: string;
  subtitle?: string;
  slides: ShowcaseSlide[];
  /** Auto-advance interval in milliseconds. Default 6500ms. */
  autoAdvanceMs?: number;
}

/**
 * Editorial slide showcase — auto-advances, smooth fade+slide transitions,
 * pause-on-hover, indicator dots, and `prefers-reduced-motion` respect.
 *
 * Designed to mirror the editorial cadence of institutional sites
 * (Stripe Atlas, Linear, Vercel) rather than retail marquees.
 */
export function EditorialShowcase({
  eyebrow,
  title,
  subtitle,
  slides,
  autoAdvanceMs = 6500,
}: EditorialShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-advance loop. Pauses when hovered or reduced-motion preferred.
  useEffect(() => {
    if (paused || reduceMotion || slides.length <= 1) return;
    const t = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length);
    }, autoAdvanceMs);
    return () => window.clearInterval(t);
  }, [paused, reduceMotion, slides.length, autoAdvanceMs]);

  // Pause when not in viewport — saves CPU on long pages.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => setPaused((prev) => (entry.isIntersecting ? prev : true)),
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const goTo = useCallback((index: number) => {
    setActiveIndex(((index % slides.length) + slides.length) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  if (slides.length === 0) return null;

  const slide = slides[activeIndex];
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <section
      ref={containerRef}
      className="section-padding border-t border-border/60 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-default px-4 sm:px-6">
        <div className="mb-10 sm:mb-14">
          <div className="t-eyebrow mb-3">{eyebrow}</div>
          <h2 className="t-display-section text-foreground mb-3">{title}</h2>
          {subtitle && (
            <p className="t-lead text-muted-foreground max-w-2xl">{subtitle}</p>
          )}
        </div>

        <div
          className="relative rounded-2xl border border-border/80 bg-card overflow-hidden"
          role="region"
          aria-roledescription="carousel"
          aria-label={title}
        >
          {/* Subtle amber radial background — institutional accent */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute -top-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-amber-500/[0.06] blur-3xl" />
          </div>

          <div className="relative grid lg:grid-cols-12 gap-8 p-6 sm:p-10 lg:p-14 min-h-[360px] lg:min-h-[420px]">
            {/* Left — Copy */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`copy-${activeIndex}`}
                  initial={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduceMotion ? 0 : -24 }}
                  transition={transition}
                >
                  <div className="t-eyebrow text-amber-400 mb-4">{slide.eyebrow}</div>
                  <h3 className="font-display text-3xl md:text-4xl lg:text-5xl leading-tight text-foreground mb-4">
                    {slide.title}
                  </h3>
                  <p className="t-lead text-muted-foreground max-w-xl mb-6">
                    {slide.description}
                  </p>
                  {slide.ctaHref && slide.ctaLabel && (
                    <Link
                      href={slide.ctaHref}
                      className="inline-flex items-center gap-2 t-body-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      {slide.ctaLabel}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right — Big metric */}
            <div className="lg:col-span-5 flex flex-col justify-center items-start lg:items-end">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`metric-${activeIndex}`}
                  initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.92 }}
                  transition={transition}
                  className="text-left lg:text-right"
                >
                  <div className="font-display text-7xl md:text-8xl lg:text-[7rem] font-medium text-amber-400 leading-none tabular-nums">
                    {slide.metric}
                  </div>
                  <div className="t-eyebrow mt-3">{slide.metricLabel}</div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Controls — indicator dots + prev/next */}
          <div className="relative flex items-center justify-between gap-4 px-6 sm:px-10 lg:px-14 pb-6 lg:pb-8 pt-2">
            <div className="flex gap-1.5" role="tablist" aria-label="Slides">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    i === activeIndex ? 'w-8 bg-amber-400' : 'w-2 bg-foreground/20 hover:bg-foreground/40',
                  )}
                />
              ))}
            </div>
            {slides.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous slide"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border/80 hover:border-amber-400/40 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next slide"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border/80 hover:border-amber-400/40 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
