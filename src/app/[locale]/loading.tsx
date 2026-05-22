/**
 * Locale-segment loading fallback.
 *
 * Match struktur final exactly (Pak Abdullah audit 2026-05-22 — "header
 * ada dua, tick belum siap halaman sudah keload"). Loading shell harus
 * mirror final layout:
 *   [TickerBar skeleton] → [Nav skeleton] → [Hero skeleton]
 *
 * Tidak ada flicker "double header" karena saat real komponen mount,
 * dimensi + posisi sama persis dengan skeleton.
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function LocaleLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ticker skeleton — match TickerBar dimensions exactly (h-9 = py-2 + content) */}
      <div
        className="relative w-full overflow-hidden border-b border-amber-500/15 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 z-[40]"
        aria-busy="true"
        aria-label="Live market ticker loading"
      >
        <div className="flex whitespace-nowrap py-2 px-4 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="inline-flex items-center gap-2 shrink-0">
              <span className="inline-block h-3 w-8 rounded bg-slate-800/60 animate-pulse" />
              <span className="inline-block h-3 w-14 rounded bg-slate-800/40 animate-pulse" />
              <span className="inline-block h-3 w-10 rounded bg-slate-800/30 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Nav skeleton — match sticky h-16 enterprise-nav */}
      <div className="sticky top-0 inset-x-0 z-[80] h-16 bg-background/80 backdrop-blur border-b border-transparent">
        <div className="layout-container h-full flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-32" />
          <div className="hidden lg:flex items-center gap-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md hidden sm:block" />
            <Skeleton className="h-9 w-24 rounded-md hidden lg:block" />
          </div>
        </div>
      </div>

      {/* Hero skeleton */}
      <section className="section-padding">
        <div className="layout-container">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 sm:h-14 w-full max-w-2xl mb-3" />
          <Skeleton className="h-10 sm:h-14 w-3/4 max-w-xl mb-6" />
          <Skeleton className="h-4 w-full max-w-2xl mb-2" />
          <Skeleton className="h-4 w-5/6 max-w-2xl mb-2" />
          <Skeleton className="h-4 w-3/4 max-w-xl" />

          <div className="flex flex-wrap gap-3 mt-8">
            <Skeleton className="h-11 w-36 rounded-md" />
            <Skeleton className="h-11 w-32 rounded-md" />
          </div>
        </div>
      </section>
    </div>
  );
}
