# Konsep UI, Animasi & Polish — BabahAlgo

> Dokumen ini mendetailkan SEMUA perbaikan visual, animasi, responsive, dan micro-interaction
> yang dibutuhkan untuk menaikkan kualitas UI dari 7/10 ke 9/10.
>
> Tanggal: 2026-04-17 | Library utama: `framer-motion` | Estimasi total: ~6 jam kerja
> Prinsip: **Subtle, profesional, tidak berlebihan** — standar dashboard fintech enterprise.

---

## 1. Audit Kondisi Saat Ini

### Skor Per Kategori

| Kategori | Skor Sekarang | Target | Gap |
|----------|---------------|--------|-----|
| Responsive | 8.5/10 | 9.5/10 | Sidebar mobile |
| Tipografi | 9/10 | 9/10 | Sudah sempurna |
| Sistem Warna | 8.5/10 | 9/10 | Tambah depth/shadow |
| Komponen UI | 8/10 | 9/10 | Loading state, skeleton |
| Desain Visual | 7/10 | 9/10 | Shadow, depth, glassmorphism |
| **Animasi** | **3/10** | **9/10** | **Gap terbesar** |
| Loading State | 2/10 | 9/10 | Skeleton, spinner |
| Mobile Sidebar | 4/10 | 9/10 | Hamburger + slide |

### Yang TIDAK Perlu Diubah

- Font Inter + JetBrains Mono — sempurna
- CSS variables HSL — sudah lengkap
- Tailwind breakpoint strategy (sm/md/lg/xl) — konsisten
- CVA-based Button component — fleksibel
- Chart library (Lightweight Charts + Recharts) — tepat
- Lucide React icons — konsisten
- Dark mode default — standar trading platform
- AnimatedCounter di landing hero — sudah bagus, pertahankan

---

## 2. Dependency Baru

```bash
npm install framer-motion
```

Hanya **satu library** tambahan. Framer Motion dipilih karena:
- React-native (bukan DOM manipulation)
- SSR-compatible dengan Next.js 14 App Router
- AnimatePresence untuk exit animation
- whileInView untuk scroll-triggered animation
- Layout animation untuk reorder (bonus: drag-and-drop gratis)
- Bundle: ~32KB gzipped (acceptable untuk dashboard)

**TIDAK PERLU** install: AOS, GSAP, react-spring, atau library animasi lain.

---

## 3. Komponen Animasi Reusable (File Baru)

### 3.1 `src/components/ui/animated-section.tsx`

Wrapper untuk scroll-triggered fade-in + slide-up. Dipakai di SETIAP section landing page.

```tsx
'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;
  delay?: number;        // detik, default 0
  direction?: 'up' | 'down' | 'left' | 'right';  // default 'up'
  duration?: number;     // detik, default 0.6
  className?: string;
}

// Konfigurasi offset berdasarkan direction
const directionOffset = {
  up:    { y: 30 },
  down:  { y: -30 },
  left:  { x: 30 },
  right: { x: -30 },
};

export function AnimatedSection({
  children,
  delay = 0,
  direction = 'up',
  duration = 0.6,
  className,
}: AnimatedSectionProps) {
  const offset = directionOffset[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

**Penggunaan:**
```tsx
<AnimatedSection>
  <h2>Track Record Terverifikasi</h2>
</AnimatedSection>

<AnimatedSection delay={0.2} direction="left">
  <EquityCurve data={...} />
</AnimatedSection>
```

### 3.2 `src/components/ui/stagger-container.tsx`

Wrapper untuk card grid — anak-anak muncul satu per satu dengan jeda.

```tsx
'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;  // detik antar anak, default 0.1
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: (staggerDelay: number) => ({
    transition: { staggerChildren: staggerDelay },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-30px' }}
      custom={staggerDelay}
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
```

**Penggunaan (KPI cards, feature cards, pricing cards):**
```tsx
<StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {kpiCards.map((card) => (
    <StaggerItem key={card.id}>
      <Card>{/* ... */}</Card>
    </StaggerItem>
  ))}
</StaggerContainer>
```

### 3.3 `src/components/ui/skeleton.tsx`

Placeholder animasi saat data belum dimuat.

```tsx
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/50',
        className
      )}
    />
  );
}

// Preset untuk komponen umum
export function SkeletonCard() {
  return (
    <div className="rounded-lg border p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-lg border p-4">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-[280px] md:h-[320px] w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border">
      <Skeleton className="h-10 w-full rounded-t-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-t">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
```

### 3.4 `src/components/ui/smooth-accordion.tsx`

FAQ accordion dengan transisi smooth.

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

interface SmoothAccordionProps {
  items: AccordionItem[];
  className?: string;
}

export function SmoothAccordion({ items, className }: SmoothAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="rounded-lg border bg-card">
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-accent/50 transition-colors rounded-lg"
            >
              {item.question}
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 4. Sidebar Responsive (Mobile Hamburger + Slide)

### File: `src/components/layout/responsive-sidebar.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface ResponsiveSidebarProps {
  children: React.ReactNode;  // konten sidebar (nav items)
}

export function ResponsiveSidebar({ children }: ResponsiveSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tutup sidebar saat navigasi
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Tutup saat tekan Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      {/* Hamburger button — hanya muncul di mobile/tablet */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl 
                   bg-background/80 backdrop-blur-md border shadow-lg
                   hover:bg-accent transition-colors"
        aria-label="Buka menu navigasi"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar — tetap visible, tidak berubah */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-background">
        {children}
      </aside>

      {/* Mobile overlay + slide sidebar */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop gelap */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Sidebar panel */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 
                         bg-background border-r shadow-2xl lg:hidden
                         overflow-y-auto"
            >
              {/* Tombol tutup */}
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg 
                           hover:bg-accent transition-colors"
                aria-label="Tutup menu"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Konten sidebar yang sama dengan desktop */}
              {children}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

### Cara pasang di admin layout

```tsx
// src/app/(admin)/admin/layout.tsx — SEBELUM:
<aside className="w-64 border-r">
  <SidebarContent />
</aside>

// SESUDAH:
import { ResponsiveSidebar } from '@/components/layout/responsive-sidebar';

<ResponsiveSidebar>
  <SidebarContent />
</ResponsiveSidebar>
```

Sama persis untuk portal layout (`src/app/(portal)/portal/layout.tsx`).

---

## 5. Modal & Popup Entrance Animation

### Pattern untuk SEMUA modal/dialog/popup

```tsx
// Ganti setiap popup/modal yang muncul instan:

// SEBELUM (instan, kasar):
{showPopup && (
  <div className="fixed inset-0 z-50">
    <div className="bg-card rounded-2xl p-6">...</div>
  </div>
)}

// SESUDAH (smooth fade+scale):
<AnimatePresence>
  {showPopup && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-card rounded-2xl p-6 max-w-lg mx-4 shadow-2xl border"
      >
        {/* konten popup */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### File yang perlu di-update

| File | Perubahan |
|------|-----------|
| `src/components/cms/popup-manager.tsx` | Wrap konten popup dengan motion.div fade+scale |
| `src/components/cms/banner-bar.tsx` | Tambah slide-down entrance saat banner muncul |
| Semua admin CMS modal (edit/create) | Wrap dengan AnimatePresence + motion.div |

### Banner slide-down pattern

```tsx
// banner-bar.tsx
<AnimatePresence>
  {activeBanner && !dismissed && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="bg-primary text-primary-foreground px-4 py-2.5 text-center text-sm">
        {/* konten banner */}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

---

## 6. Peningkatan Visual Depth

### Tambahan di `globals.css`

```css
/* ─── Shadow system (tambahkan di bawah :root) ─── */
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-glow: 0 0 20px -5px hsl(var(--primary) / 0.3);
}

.dark {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);
  --shadow-glow: 0 0 30px -5px hsl(var(--primary) / 0.2);
}

/* ─── Card hover lift ─── */
.card-hover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* ─── Glow effect untuk card penting (pricing popular, KPI highlight) ─── */
.card-glow {
  transition: box-shadow 0.3s ease;
}
.card-glow:hover {
  box-shadow: var(--shadow-glow);
}

/* ─── Gradient border (pricing card popular) ─── */
.gradient-border {
  position: relative;
  border: none;
}
.gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.3));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

/* ─── Smooth scroll behavior ─── */
html {
  scroll-behavior: smooth;
}

/* ─── Selection color ─── */
::selection {
  background: hsl(var(--primary) / 0.3);
  color: hsl(var(--primary-foreground));
}
```

### Penggunaan class baru

```tsx
// KPI card — tambah hover lift
<Card className="card-hover">

// Pricing card popular — tambah glow + gradient border
<Card className="card-glow gradient-border">

// Feature card — tambah hover lift
<Card className="card-hover hover:border-primary/50">
```

---

## 7. Tailwind Config Tambahan

### File: `tailwind.config.ts` — extend animation

```ts
// Tambahkan di theme.extend:
extend: {
  animation: {
    'fade-in': 'fadeIn 0.5s ease-out',
    'slide-up': 'slideUp 0.5s ease-out',
    'slide-down': 'slideDown 0.3s ease-out',
    'scale-in': 'scaleIn 0.2s ease-out',
    'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
    'shimmer': 'shimmer 2s linear infinite',
  },
  keyframes: {
    fadeIn: {
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
    slideUp: {
      from: { opacity: '0', transform: 'translateY(20px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
    slideDown: {
      from: { opacity: '0', transform: 'translateY(-10px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
    scaleIn: {
      from: { opacity: '0', transform: 'scale(0.95)' },
      to: { opacity: '1', transform: 'scale(1)' },
    },
    pulseSoft: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.7' },
    },
    shimmer: {
      from: { backgroundPosition: '-200% 0' },
      to: { backgroundPosition: '200% 0' },
    },
  },
}
```

**Kapan pakai Tailwind animation vs Framer Motion:**
- **Tailwind `animate-*`**: elemen sederhana yang tidak perlu scroll-trigger (skeleton, spinner, badge pulse)
- **Framer Motion**: section masuk viewport, stagger grid, exit animation, layout animation, drag

---

## 8. Micro-Interaction untuk Button

### Tambah di `src/components/ui/button.tsx`

```tsx
// Tambahkan di base className:
// SEBELUM:
'transition-colors'

// SESUDAH:
'transition-all duration-150 active:scale-[0.98]'
```

Efek: tombol sedikit mengecil saat diklik — feedback taktil yang halus.

### Untuk CTA button utama (hero, pricing):

```tsx
// Pattern khusus CTA — lebih dramatis
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl
             font-semibold shadow-lg hover:shadow-xl transition-shadow"
>
  Mulai Sekarang
</motion.button>
```

---

## 9. Peta Penerapan Per Halaman

### Landing Page `/`

| Section | Animasi | Komponen |
|---------|---------|----------|
| Hero | Fade-in judul (delay 0), fade-in subtitle (delay 0.2), stagger metrik cards (delay 0.4) | `AnimatedSection` + `StaggerContainer` |
| Social proof bar | Slide-in dari kiri | `AnimatedSection direction="left"` |
| Performance (equity curve) | Fade-in chart container | `AnimatedSection delay={0.1}` |
| KPI cards | Stagger 4 cards | `StaggerContainer` + `StaggerItem` |
| Features grid | Stagger 6 cards | `StaggerContainer staggerDelay={0.08}` |
| Strategy donut + bar | Fade-in kiri (donut) + kanan (bar) | `AnimatedSection direction="left/right"` |
| Pricing cards | Stagger 3 cards, card popular dengan glow | `StaggerContainer` + `card-glow` |
| Risk accordion | Smooth expand/collapse | `SmoothAccordion` |
| How it works | Stagger 4 step cards | `StaggerContainer` |
| Testimonials | Fade-in carousel | `AnimatedSection` |
| FAQ preview | Smooth accordion | `SmoothAccordion` |
| CTA final | Fade-in + glow button | `AnimatedSection` + `motion.button` |

### Admin Dashboard `/admin`

| Komponen | Animasi | Komponen |
|----------|---------|----------|
| KPI cards | Stagger 4 cards saat mount | `StaggerContainer` |
| Equity chart | Skeleton → fade-in saat data loaded | `SkeletonChart` → `animate-fade-in` |
| PnL bar chart | Skeleton → fade-in | Sama |
| Scanner heatmap | Stagger cells | `StaggerContainer staggerDelay={0.02}` |
| AI state cards | Slide-in dari kanan | `AnimatedSection direction="right"` |
| Positions table | Skeleton rows → fade-in | `SkeletonTable` → data |
| VPS grid | Stagger cards | `StaggerContainer` |
| Audit log table | Skeleton → fade-in | `SkeletonTable` |

### Client Portal `/portal`

| Komponen | Animasi |
|----------|---------|
| KPI cards | Stagger 4 cards |
| Equity curve | Skeleton → fade-in |
| Open positions | Skeleton rows → fade-in, row flash hijau/merah saat PnL berubah |
| Activity feed | Slide-down saat item baru masuk (prepend animation) |
| Daily PnL bar | Fade-in |

### Register Wizard `/register/*`

| Step | Animasi |
|------|---------|
| Step indicator | Progress bar transition width smooth |
| Step content | Slide-left saat maju, slide-right saat mundur |
| Form fields | Stagger fade-in saat step baru muncul |
| Success state | Scale-in + confetti (opsional) |

---

## 10. PnL Row Flash (Posisi Terbuka)

Efek: saat floating PnL berubah, row flash hijau (naik) atau merah (turun) selama 0.5 detik.

```tsx
// Di LivePositionsTable, track perubahan PnL per row:
const [flashMap, setFlashMap] = useState<Record<string, 'profit' | 'loss' | null>>({});

useEffect(() => {
  // Bandingkan PnL baru vs lama
  positions.forEach(pos => {
    const prev = prevPositions.find(p => p.ticket === pos.ticket);
    if (prev && pos.floating_net_usd !== prev.floating_net_usd) {
      const direction = pos.floating_net_usd > prev.floating_net_usd ? 'profit' : 'loss';
      setFlashMap(m => ({ ...m, [pos.ticket]: direction }));
      // Reset setelah 500ms
      setTimeout(() => {
        setFlashMap(m => ({ ...m, [pos.ticket]: null }));
      }, 500);
    }
  });
}, [positions]);

// Di render row:
<tr className={cn(
  'transition-colors duration-500',
  flashMap[pos.ticket] === 'profit' && 'bg-green-500/10',
  flashMap[pos.ticket] === 'loss' && 'bg-red-500/10',
)}>
```

---

## 11. Loading Pattern Standar

### Pattern untuk setiap halaman yang fetch data

```tsx
// SEBELUM (saat ini):
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

if (loading) return <p>Loading...</p>;  // ← BURUK

// SESUDAH:
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

if (loading) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
      <SkeletonChart />
      <SkeletonTable rows={5} />
    </div>
  );
}

// Data loaded — fade-in
return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    {/* konten sebenarnya */}
  </motion.div>
);
```

### Halaman yang perlu skeleton

| Halaman | Skeleton Layout |
|---------|----------------|
| `/admin` (dashboard) | 4x SkeletonCard + SkeletonChart + SkeletonTable |
| `/admin/cms/landing` | SkeletonTable (12 rows) |
| `/admin/cms/pricing` | 3x SkeletonCard |
| `/admin/licenses` | SkeletonTable (10 rows) |
| `/admin/vps` | SkeletonTable (5 rows) |
| `/portal` (dashboard) | 4x SkeletonCard + SkeletonChart |
| `/portal/positions` | SkeletonTable (5 rows) |
| `/portal/history` | SkeletonTable (10 rows) |
| `/portal/performance` | 6x SkeletonCard + 2x SkeletonChart |

---

## 12. Checklist Implementasi

### Urutan eksekusi (dari dampak tertinggi ke terendah)

```
FASE 1 — Foundation (1 jam)
├── [ ] npm install framer-motion
├── [ ] Buat src/components/ui/animated-section.tsx
├── [ ] Buat src/components/ui/stagger-container.tsx
├── [ ] Buat src/components/ui/skeleton.tsx
├── [ ] Buat src/components/ui/smooth-accordion.tsx
├── [ ] Tambah keyframes + animation di tailwind.config.ts
└── [ ] Tambah shadow system + card-hover/card-glow di globals.css

FASE 2 — Landing Page (2 jam)
├── [ ] Wrap setiap section dengan AnimatedSection
├── [ ] KPI cards → StaggerContainer
├── [ ] Feature cards → StaggerContainer
├── [ ] Pricing cards → StaggerContainer + card-glow di popular
├── [ ] FAQ → ganti dengan SmoothAccordion
├── [ ] CTA button → motion.button whileHover/whileTap
└── [ ] Tambah card-hover di semua card interaktif

FASE 3 — Sidebar Responsive (1 jam)
├── [ ] Buat src/components/layout/responsive-sidebar.tsx
├── [ ] Ganti aside di admin layout → ResponsiveSidebar
├── [ ] Ganti aside di portal layout → ResponsiveSidebar
└── [ ] Test: resize browser 375px → hamburger muncul, klik → slide sidebar

FASE 4 — Skeleton Loading (1 jam)
├── [ ] Admin dashboard: skeleton saat loading
├── [ ] Portal dashboard: skeleton saat loading
├── [ ] Portal positions: skeleton table saat loading
├── [ ] Portal history: skeleton table saat loading
├── [ ] Admin CMS pages: skeleton saat loading
└── [ ] Fade-in transition saat data loaded

FASE 5 — Modal & Popup (30 menit)
├── [ ] popup-manager.tsx: AnimatePresence + fade+scale
├── [ ] banner-bar.tsx: slide-down entrance
└── [ ] Admin CMS edit modals: AnimatePresence

FASE 6 — Micro-Interactions (30 menit)
├── [ ] Button base: tambah active:scale-[0.98]
├── [ ] PnL row flash di positions table
├── [ ] Register wizard: step slide transition
└── [ ] Smooth scroll behavior (globals.css)
```

### Verifikasi setelah implementasi

```
[ ] npm run build → 0 errors (framer-motion SSR compatible)
[ ] Buka halaman landing di mobile (375px) → sidebar hamburger berfungsi
[ ] Scroll landing page → section fade-in saat masuk viewport
[ ] Buka admin dashboard → skeleton muncul, lalu fade ke data
[ ] Klik FAQ → smooth expand/collapse
[ ] Hover pricing card popular → glow effect
[ ] Klik CTA button → scale feedback
[ ] Resize browser 375→1280px → semua layout responsif tanpa break
[ ] Lighthouse Performance → masih ≥ 85 (framer-motion tidak boleh bikin lambat)
```

---

## 13. Referensi File

| File Baru | Fungsi |
|-----------|--------|
| `src/components/ui/animated-section.tsx` | Scroll-triggered fade-in wrapper |
| `src/components/ui/stagger-container.tsx` | Grid card stagger animation |
| `src/components/ui/skeleton.tsx` | Loading placeholder (card, chart, table) |
| `src/components/ui/smooth-accordion.tsx` | FAQ accordion smooth expand |
| `src/components/layout/responsive-sidebar.tsx` | Mobile hamburger + slide sidebar |

| File Dimodifikasi | Perubahan |
|-------------------|-----------|
| `tailwind.config.ts` | Tambah 6 animation keyframes |
| `src/app/globals.css` | Tambah shadow system, card-hover, card-glow, gradient-border, smooth scroll |
| `src/components/ui/button.tsx` | Tambah `active:scale-[0.98]` |
| `src/app/page.tsx` / `landing-client.tsx` | Wrap section dengan AnimatedSection + StaggerContainer |
| `src/app/(admin)/admin/layout.tsx` | Ganti aside → ResponsiveSidebar |
| `src/app/(portal)/portal/layout.tsx` | Ganti aside → ResponsiveSidebar |
| `src/components/cms/popup-manager.tsx` | AnimatePresence entrance |
| `src/components/cms/banner-bar.tsx` | Slide-down entrance |
| Semua halaman admin/portal yang fetch data | Skeleton loading → fade-in transition |
