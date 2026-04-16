# Konsep Brand, CMS-Driven Guest Pages & Content Management

> Dokumen ini mendetailkan: rekomendasi nama, halaman publik yang bisa diedit dari admin,
> skema CMS database, flow registrasi, menu lengkap, dan strategi SEO.
>
> Prinsip utama: **semua konten halaman depan bisa diubah dari admin panel tanpa sentuh kode.**
> Ini skala enterprise — bukan hardcode HTML.

---

## 1. Brand Final: BabahAlgo

> **Keputusan terkunci 2026-04-17:** Nama = **BabahAlgo**, Domain = **babahalgo.com**

| Aspek | Detail |
|-------|--------|
| Nama | **BabahAlgo** |
| Asal | "Babah" (pedagang bijak, patriark bisnis Indonesia-Tionghoa) + "Algo" (algorithmic trading) |
| Pengucapan | *ba-BAH-al-go* — 4 suku kata, natural di Indonesia dan internasional |
| Kesan | Lokal-kultural + teknologi tinggi, konsisten dengan CV Babah Digital |
| Domain utama | `babahalgo.com` — frontend/CMS (Vercel) |
| Domain API | `api.babahalgo.com` — bridge middleware (VPS2 via Cloudflare Tunnel) |
| Perusahaan | CV Babah Digital (payung hukum) |

### Komponen Brand Lengkap

```
Nama:        BabahAlgo
Tagline:     "Autonomous Intelligence. Institutional Precision."
Deskripsi:   BabahAlgo adalah mesin kuantitatif otonom yang menyatukan Kecerdasan
             Buatan generatif (Gemini 2.5 Flash), skema Wyckoff, Smart Money Concepts,
             pola Quasimodo, dan 6 strategi eksekusi untuk perdagangan presisi 24/7
             di 14 instrumen lintas 4 kelas aset (Forex, Metals, Energy, Crypto).
             Dibangun oleh CV Babah Digital di atas arsitektur Zero-Trust 3-lapis
             dengan pertahanan modal 12 lapisan.

Nilai Inti:
  1. Autonomy — Operasi 24/7 tanpa emosi, tanpa keraguan
  2. Algo-Synthesis — 6 metodologi analisa dalam 1 pipeline keputusan algoritma
  3. Resilience — 12 lapisan pertahanan modal, Zero-Trust infrastructure

Domain Mapping:
  babahalgo.com          → Vercel (frontend SSR, halaman publik, admin, client)
  api.babahalgo.com      → VPS2 Hostinger via Cloudflare Tunnel (API bridge, DB, cron)
  *.babahalgo.com        → Wildcard untuk sub-domain klien VPS (opsional masa depan)

Warna Brand:
  Primary:   #0ea5e9 (sky-500 — cyan blue, AI/teknologi)
  Secondary: #1e3a5f (deep finance blue — stabilitas/institusi)
  Accent:    #22c55e (green-500 — profit/pertumbuhan)
  Danger:    #ef4444 (red-500 — risk/alert)
  Surface:   #0b1120 (dark navy — latar gelap profesional)
```

---

## 2. Arsitektur CMS (Content Management System)

### Prinsip Desain

Semua konten halaman publik disimpan di **database middleware (VPS2)** dan bisa diedit dari **admin panel** tanpa deploy ulang. Next.js SSR membaca konten dari DB saat render halaman.

```
Admin Panel (/admin/content/*)
      ↓ CRUD via API routes
Database (Prisma, tabel cms_*)
      ↓ Query saat request masuk
Next.js SSR (halaman guest/publik)
      ↓ Render HTML dengan konten dinamis
Browser pengunjung
```

### Schema Prisma (Tambahan untuk CMS)

```prisma
// ─── CMS: Global Settings ─────────────────────────
model SiteSetting {
  id        String   @id @default(cuid())
  key       String   @unique    // "site_name", "tagline", "logo_url", dll
  value     String   @db.Text   // plain text atau JSON string
  type      String   @default("text") // "text" | "json" | "image" | "html"
  updatedAt DateTime @updatedAt
  updatedBy String?              // userId yang terakhir edit
}

// ─── CMS: Landing Page Sections ───────────────────
model LandingSection {
  id        String  @id @default(cuid())
  slug      String  @unique     // "hero", "performance", "features", "strategies", dll
  title     String              // Judul section (bisa bahasa Indonesia)
  subtitle  String?             // Sub-judul opsional
  content   Json    @default("{}") // Konten dinamis (struktur beda per section type)
  type      String              // "hero" | "kpi" | "features" | "strategies" | "pricing" | "pairs" | "risk" | "howItWorks" | "cta" | "custom"
  sortOrder Int     @default(0) // Urutan tampil di halaman
  visible   Boolean @default(true) // Toggle show/hide tanpa hapus
  metadata  Json    @default("{}") // SEO: og:image, schema.org, dll
  updatedAt DateTime @updatedAt
  updatedBy String?

  @@index([sortOrder])
}

// ─── CMS: Pricing Tiers ──────────────────────────
model PricingTier {
  id          String  @id @default(cuid())
  name        String              // "Signal Basic", "PAMM Pro", "VPS License"
  slug        String  @unique     // "signal-basic", "pamm-pro", "vps-license"
  tagline     String?             // "Untuk pemula" / "Untuk institusi"
  price       String              // "$49/bulan", "20-30% profit share", "$3,000 - $7,500"
  priceNote   String?             // "* + $150-300/bulan maintenance"
  features    Json    @default("[]") // ["Dashboard real-time", "Signal Telegram", ...]
  limitations Json    @default("[]") // ["Tanpa akses bot langsung"]
  ctaLabel    String  @default("Daftar Sekarang")
  ctaLink     String  @default("/register")
  popular     Boolean @default(false)  // Badge "Populer" / "Recommended"
  sortOrder   Int     @default(0)
  visible     Boolean @default(true)
  updatedAt   DateTime @updatedAt

  @@index([sortOrder])
}

// ─── CMS: Banner & Popup ─────────────────────────
model Banner {
  id           String   @id @default(cuid())
  title        String
  content      String   @db.Text  // Markdown atau HTML pendek
  ctaLabel     String?             // Tombol CTA (opsional)
  ctaLink      String?
  position     String   @default("top") // "top" | "bottom" | "floating"
  bgColor      String   @default("#0ea5e9")
  textColor    String   @default("#ffffff")
  startAt      DateTime?           // Jadwal mulai (null = langsung aktif)
  endAt        DateTime?           // Jadwal berakhir (null = tidak berakhir)
  active       Boolean  @default(true)
  dismissable  Boolean  @default(true) // Bisa ditutup user?
  showOnPages  Json     @default("[\"*\"]") // ["*"] semua, ["/", "/pricing"] halaman tertentu
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([active, startAt, endAt])
}

model Popup {
  id           String   @id @default(cuid())
  title        String
  content      String   @db.Text
  ctaLabel     String?
  ctaLink      String?
  imageUrl     String?             // Hero image di popup
  trigger      String   @default("delay") // "delay" | "exit_intent" | "scroll_50" | "page_load"
  delayMs      Int      @default(5000)    // Untuk trigger "delay"
  frequency    String   @default("once_per_session") // "once_per_session" | "once_per_day" | "every_visit"
  startAt      DateTime?
  endAt        DateTime?
  active       Boolean  @default(true)
  showOnPages  Json     @default("[\"*\"]")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// ─── CMS: FAQ ────────────────────────────────────
model Faq {
  id        String  @id @default(cuid())
  question  String
  answer    String  @db.Text
  category  String  @default("general") // "general" | "pricing" | "technical" | "security"
  sortOrder Int     @default(0)
  visible   Boolean @default(true)
  updatedAt DateTime @updatedAt

  @@index([category, sortOrder])
}

// ─── CMS: Testimonial ───────────────────────────
model Testimonial {
  id        String  @id @default(cuid())
  name      String              // "Ahmad S."
  role      String?             // "Private Investor, Jakarta"
  content   String  @db.Text    // Kutipan singkat
  rating    Int     @default(5) // 1-5 bintang
  avatarUrl String?
  visible   Boolean @default(true)
  sortOrder Int     @default(0)
  createdAt DateTime @default(now())

  @@index([visible, sortOrder])
}

// ─── CMS: SEO Meta per Halaman ──────────────────
model PageMeta {
  id              String  @id @default(cuid())
  path            String  @unique  // "/", "/pricing", "/register", dll
  title           String           // <title> tag
  description     String  @db.Text // <meta name="description">
  ogTitle         String?
  ogDescription   String?
  ogImage         String?          // URL gambar OG
  canonical       String?          // Canonical URL
  robots          String  @default("index, follow")
  structuredData  Json?            // JSON-LD schema.org
  updatedAt       DateTime @updatedAt
}
```

### Total Model CMS: 7 model baru

Ditambahkan ke schema Prisma yang sudah ada (9 model existing) → **total 16 model**.

---

## 3. Halaman Publik (Guest) — Menu & Struktur

### Sitemap Publik

```
/                          ← Landing page (CMS-driven)
/pricing                   ← Halaman pricing detail (CMS: PricingTier)
/features                  ← Fitur dan teknologi (CMS: LandingSection type=features)
/performance               ← Track record + MyFxBook (CMS: LandingSection type=kpi)
/faq                       ← Frequently Asked Questions (CMS: Faq)
/about                     ← Tentang CV Babah Digital (CMS: LandingSection)
/register                  ← Pendaftaran akun baru (multi-step)
/register/signal           ← Daftar paket Signal
/register/pamm             ← Daftar paket PAMM
/register/vps              ← Enquiry VPS License (form kontak, bukan self-serve)
/login                     ← Login (sudah ada)
/terms                     ← Syarat & Ketentuan (CMS: SiteSetting)
/privacy                   ← Kebijakan Privasi (CMS: SiteSetting)
/risk-disclaimer           ← Disclaimer Risiko (CMS: SiteSetting) ← WAJIB untuk fintech
```

### Navbar Publik

```
┌──────────────────────────────────────────────────────────┐
│  BabahAlgo Logo  │  Fitur  │  Performa  │  Harga  │  FAQ  │
│                │                          [Masuk] [Daftar]│
└──────────────────────────────────────────────────────────┘

Mobile: hamburger menu
Sticky on scroll, background blur saat scroll > 50px
```

### Footer Publik

```
┌──────────────────────────────────────────────────────────┐
│  BabahAlgo                    Produk           Perusahaan  │
│  Autonomous Intelligence.   Fitur            Tentang     │
│  Institutional Precision.   Performa         Kontak      │
│                             Harga            Blog        │
│  © 2026 CV Babah Digital    FAQ              Karier      │
│                                                           │
│  Hukum                      Ikuti Kami                    │
│  Syarat & Ketentuan         Twitter                      │
│  Kebijakan Privasi          Telegram                     │
│  Disclaimer Risiko          LinkedIn                     │
│                                                           │
│  ⚠ Peringatan Risiko: Perdagangan instrumen finansial    │
│  mengandung risiko kerugian yang signifikan dan mungkin   │
│  tidak sesuai untuk semua investor. Kinerja masa lalu     │
│  tidak menjamin hasil di masa depan.                      │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Halaman Landing `/` — Detail Section-by-Section (CMS-Driven)

Setiap section di bawah ini diload dari tabel `LandingSection` berdasarkan `slug`.
Admin bisa: mengubah judul, konten, urutan, dan toggle visible/hidden.

### Section 1: Hero (`slug: "hero"`)

```
CMS content JSON:
{
  "headline": "Kecerdasan Otonom untuk Pasar Finansial",
  "subheadline": "Mesin kuantitatif yang menyatukan 6 strategi analisa...",
  "ctaPrimary": { "label": "Lihat Performa", "link": "#performance" },
  "ctaSecondary": { "label": "Mulai Sekarang", "link": "/register" },
  "metrics": [
    { "value": "14", "label": "Instrumen", "icon": "chart" },
    { "value": "6", "label": "Strategi AI", "icon": "brain" },
    { "value": "<2ms", "label": "Latensi Eksekusi", "icon": "zap" }
  ],
  "backgroundType": "gradient"  // "gradient" | "video" | "particles"
}
```

**Render:** Full viewport height, gradient gelap, animasi counter untuk metrik.

### Section 2: Social Proof Bar (`slug: "social-proof"`)

```
CMS content JSON:
{
  "items": [
    { "type": "stat", "value": "24/7", "label": "Pemantauan AI" },
    { "type": "stat", "value": "99.7%", "label": "Uptime Server" },
    { "type": "badge", "label": "Terverifikasi MyFxBook", "link": "https://myfxbook.com/..." },
    { "type": "stat", "value": "3+", "label": "Tahun Pengembangan" }
  ]
}
```

**Render:** Strip horizontal, background sedikit lebih terang dari hero, scrolling marquee di mobile.

### Section 3: Performance (`slug: "performance"`)

```
CMS content JSON:
{
  "headline": "Track Record Terverifikasi",
  "subheadline": "Data real-time dari akun produksi, diaudit publik",
  "myfxbookUrl": "https://www.myfxbook.com/members/...",
  "showEquityCurve": true,
  "showKpiCards": true,
  "kpiPeriodDays": 90,
  "kpiOverrides": null  // null = ambil dari VPS1 live, atau JSON manual override
}
```

**Render:**
- Equity curve (Lightweight Charts, data cache dari VPS1 per jam)
- 6 KPI cards (dari cache `/api/performance/summary`)
- Tombol "Verifikasi di MyFxBook" (link eksternal)

**Admin bisa:** ubah headline, toggle curve on/off, override KPI jika VPS1 down.

### Section 4: Features (`slug: "features"`)

```
CMS content JSON:
{
  "headline": "Teknologi di Balik Setiap Keputusan",
  "cards": [
    {
      "icon": "brain",
      "title": "AI Advisor",
      "description": "Gemini 2.5 Flash menganalisa setiap pair dengan penalaran multi-timeframe",
      "badge": null
    },
    {
      "icon": "layers",
      "title": "6 Strategi Sinergi",
      "description": "SMC, Wyckoff, Quasimodo, AI Momentum, Astronacci, Oil & Gas",
      "badge": "Multi-Strategy"
    },
    {
      "icon": "shield",
      "title": "12 Lapisan Risk Management",
      "description": "Dari dynamic lot sizing hingga catastrophic breaker otomatis",
      "badge": null
    },
    {
      "icon": "activity",
      "title": "Multi-Timeframe Confluence",
      "description": "H4 → H1 → M15 → M5 scoring sebelum eksekusi",
      "badge": null
    },
    {
      "icon": "globe",
      "title": "14 Instrumen, 4 Kelas Aset",
      "description": "Forex, Metals, Energy, Crypto — diversifikasi lintas pasar",
      "badge": null
    },
    {
      "icon": "zap",
      "title": "Latensi <2ms",
      "description": "ZeroMQ bridge langsung ke MetaTrader 5 tanpa bottleneck web",
      "badge": null
    }
  ]
}
```

**Render:** Grid 2x3 (desktop), 1 kolom (mobile), card dengan ikon Lucide, hover elevasi.

### Section 5: Strategy Breakdown (`slug: "strategies"`)

```
CMS content JSON:
{
  "headline": "Strategi Diversifikasi",
  "strategies": [
    { "name": "Smart Money Concepts", "pct": 35, "color": "#3b82f6", "description": "BOS, CHoCH, FVG, Order Block" },
    { "name": "Wyckoff Combo", "pct": 25, "color": "#8b5cf6", "description": "Accumulation, Distribution, Spring, UTAD" },
    { "name": "AI Momentum", "pct": 20, "color": "#a855f7", "description": "Structure bias + volume confirmation" },
    { "name": "Oil & Gas", "pct": 10, "color": "#f59e0b", "description": "Energy mean-reversion (EMA+RSI+BB)" },
    { "name": "Astronacci", "pct": 5, "color": "#06b6d4", "description": "Fibonacci cycle timing" },
    { "name": "SMC Swing", "pct": 5, "color": "#ec4899", "description": "HTF structure entry" }
  ],
  "showDonut": true,
  "showWinRateBar": true
}
```

**Render:** Donut chart (Recharts) + horizontal win rate bar di sampingnya.
**Admin bisa:** update persentase dan nama strategi seiring strategi berkembang.

### Section 6: Pricing (`slug: "pricing"`)

Diambil dari tabel `PricingTier`, bukan dari JSON section. Ini supaya admin bisa CRUD pricing secara terpisah.

**Render:** 3 card horizontal (Signal, PAMM, VPS), card "Popular" diberi border accent, responsive stack vertikal di mobile.

### Section 7: Pairs Coverage (`slug: "pairs"`)

```
CMS content JSON:
{
  "headline": "14 Instrumen, 4 Kelas Aset",
  "categories": [
    { "name": "Forex", "pairs": ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCHF", "NZDUSD", "USDCAD"], "icon": "currency" },
    { "name": "Metals", "pairs": ["XAUUSD", "XAGUSD"], "icon": "gem" },
    { "name": "Energy", "pairs": ["USOIL", "UKOIL", "XNGUSD"], "icon": "flame" },
    { "name": "Crypto", "pairs": ["BTCUSD", "ETHUSD"], "icon": "bitcoin" }
  ]
}
```

### Section 8: Risk Management (`slug: "risk"`)

```
CMS content JSON:
{
  "headline": "12 Lapisan Perlindungan Modal",
  "layers": [
    { "name": "Dynamic Lot Sizing", "description": "Ukuran posisi dihitung berdasarkan equity saat ini dan volatilitas pair" },
    { "name": "Catastrophic Breaker", "description": "Otomatis menghentikan semua perdagangan jika drawdown melewati batas" },
    ... 10 lagi
  ]
}
```

**Render:** Accordion vertical, nomor urut, ikon kunci/perisai.

### Section 9: How It Works (`slug: "how-it-works"`)

```
CMS content JSON:
{
  "steps": [
    { "number": 1, "title": "Pilih Paket", "description": "Signal, PAMM, atau VPS License" },
    { "number": 2, "title": "Daftar & Verifikasi", "description": "Buat akun dalam 2 menit" },
    { "number": 3, "title": "Bot AI Mulai Bekerja", "description": "Sistem analisa dan eksekusi 24/7" },
    { "number": 4, "title": "Pantau di Dashboard", "description": "Equity curve, posisi, laporan — semua real-time" }
  ]
}
```

**Render:** 4 step horizontal timeline (desktop), vertikal (mobile), garis penghubung.

### Section 10: Testimonials (`slug: "testimonials"`)

Diambil dari tabel `Testimonial`. Carousel card horizontal, auto-slide setiap 5 detik.

### Section 11: FAQ Preview (`slug: "faq-preview"`)

Diambil dari tabel `Faq` (top 5, category: "general"). Link "Lihat semua →" ke `/faq`.

### Section 12: CTA Final (`slug: "cta-final"`)

```
CMS content JSON:
{
  "headline": "Mulai Hari Ini",
  "subheadline": "Bergabung dengan investor yang mempercayakan analisa kepada kecerdasan otonom.",
  "ctaLabel": "Daftar Sekarang",
  "ctaLink": "/register",
  "secondaryLabel": "Hubungi Kami",
  "secondaryLink": "https://wa.me/62..."
}
```

---

## 5. Flow Registrasi Multi-Step

### Route: `/register` — Pilih Paket

```
┌──────────────────────────────────────────────────────────┐
│  "Pilih Paket yang Sesuai"                                │
│                                                           │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐│
│  │ SIGNAL         │ │ PAMM           │ │ VPS LICENSE    ││
│  │ Mulai $49/bln  │ │ Profit Sharing │ │ $3,000+        ││
│  │                │ │                │ │                ││
│  │ [Pilih →]      │ │ [Pilih →]      │ │ [Konsultasi →] ││
│  └────────────────┘ └────────────────┘ └────────────────┘│
│                                                           │
│  Sudah punya akun? [Masuk di sini]                        │
└──────────────────────────────────────────────────────────┘
```

### Route: `/register/signal` — Daftar Signal (self-serve)

```
Step 1/3: Buat Akun
  ├── Nama lengkap
  ├── Email
  ├── Password + konfirmasi
  ├── Nomor WhatsApp
  └── [Lanjut →]

Step 2/3: Pilih Tier
  ├── Signal Basic ($49/bulan) — Dashboard + sinyal harian
  ├── Signal VIP ($149/bulan) — Dashboard + sinyal real-time + Telegram VIP
  └── [Lanjut →]

Step 3/3: Pembayaran
  ├── Ringkasan pesanan
  ├── Metode pembayaran (Xendit: VA, QRIS, kartu kredit)
  └── [Bayar & Aktivasi →]
```

### Route: `/register/pamm` — Daftar PAMM (self-serve + broker link)

```
Step 1/3: Buat Akun
  ├── (sama seperti Signal)

Step 2/3: Pilih Tier
  ├── PAMM Basic (20% profit share) — min deposit $500
  ├── PAMM Pro (25% profit share) — min deposit $5,000, prioritas support
  └── [Lanjut →]

Step 3/3: Hubungkan Broker
  ├── Instruksi buat akun di broker partner (Exness)
  ├── Input nomor akun MT5
  ├── Instruksi enable CopyTrade / PAMM di broker
  └── [Verifikasi & Aktivasi →]
```

### Route: `/register/vps` — Enquiry VPS License (bukan self-serve)

```
Form konsultasi:
  ├── Nama / perusahaan
  ├── Email
  ├── WhatsApp
  ├── Estimasi modal trading ($)
  ├── Pengalaman trading (dropdown)
  ├── Catatan tambahan (textarea)
  └── [Kirim Permintaan →]

→ Data masuk ke tabel baru `Inquiry` di middleware DB
→ Admin terima notifikasi Telegram
→ Admin follow-up manual via WhatsApp/email
```

### Prisma model tambahan untuk registrasi

```prisma
model Inquiry {
  id           String   @id @default(cuid())
  name         String
  email        String
  whatsapp     String
  capital      String?  // "$5,000 - $25,000"
  experience   String?  // "beginner" | "intermediate" | "advanced"
  notes        String?  @db.Text
  status       String   @default("new")  // "new" | "contacted" | "converted" | "rejected"
  assignedTo   String?  // admin userId yang handle
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([status, createdAt])
}
```

---

## 6. Admin Content Management — Halaman Baru

### Menu Admin (Updated)

```
SIDEBAR ADMIN:
─── Dashboard
─── BISNIS
    ├── Licenses
    ├── Subscriptions
    ├── VPS Instances
    ├── Users
    ├── Inquiries           ← BARU (dari form VPS License)
─── BOT
    ├── Live Control        ← kontrol VPS per-klien
    ├── Kill Switch
    ├── Audit Log
─── KONTEN                  ← BARU (CMS)
    ├── Landing Page         ← Edit sections, reorder, toggle
    ├── Pricing              ← CRUD pricing tiers
    ├── FAQ                  ← CRUD FAQ items
    ├── Testimonials         ← CRUD testimonials
    ├── Banners              ← Manage promotional banners
    ├── Popups               ← Manage modal popups
    ├── SEO                  ← Meta tags per halaman
─── SISTEM
    ├── Settings             ← 2FA, API keys, branding
```

### Route: `/admin/content/landing` — Landing Page Editor

```
┌──────────────────────────────────────────────────────────┐
│  "Editor Halaman Depan"                                   │
│  [Preview di tab baru ↗]  [Publish perubahan]             │
├──────────────────────────────────────────────────────────┤
│  Drag-and-drop section list:                              │
│                                                           │
│  ☰ 1. Hero           [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│  ☰ 2. Social Proof   [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│  ☰ 3. Performance    [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│  ☰ 4. Features       [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│  ☰ 5. Strategies     [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│  ☰ 6. Pricing        [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│  ☰ 7. Pairs          [👁 Hidden]  [✏ Edit] [↑↓ Reorder] │
│  ☰ 8. Risk Mgmt      [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│  ☰ 9. How It Works   [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│  ☰ 10. Testimonials  [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│  ☰ 11. FAQ Preview   [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│  ☰ 12. CTA Final     [👁 Visible] [✏ Edit] [↑↓ Reorder] │
│                                                           │
│  [+ Tambah Section Custom]                                │
├──────────────────────────────────────────────────────────┤
│  Klik "Edit" membuka drawer/modal dengan form sesuai type:│
│  - Hero: headline, subheadline, CTA, metrik               │
│  - Features: card editor (add/remove/reorder cards)        │
│  - Pricing: redirect ke /admin/content/pricing             │
│  - Custom: rich text editor (Markdown)                     │
└──────────────────────────────────────────────────────────┘
```

### Route: `/admin/content/banners` — Banner Manager

```
┌──────────────────────────────────────────────────────────┐
│  "Kelola Banner Promosi"  [+ Buat Banner Baru]            │
├──────────────────────────────────────────────────────────┤
│  TABLE:                                                   │
│  Judul | Posisi | Jadwal | Status | Actions               │
│  "Promo Ramadan" | Top | 10-30 Apr | 🟢 Aktif | [✏][🗑]  │
│  "Diskon 20%" | Floating | 1-15 Mei | ⏳ Terjadwal | [✏] │
├──────────────────────────────────────────────────────────┤
│  Create/Edit form:                                        │
│  - Judul                                                  │
│  - Konten (Markdown atau teks pendek)                     │
│  - Tombol CTA (label + link)                              │
│  - Posisi: Top bar / Bottom bar / Floating corner         │
│  - Warna latar + teks (color picker)                      │
│  - Jadwal mulai & berakhir (date picker)                  │
│  - Bisa ditutup user? (toggle)                            │
│  - Tampil di halaman: Semua / pilih halaman spesifik      │
│  - [Simpan]  [Preview]                                    │
└──────────────────────────────────────────────────────────┘
```

### Route: `/admin/content/seo` — SEO Manager

```
┌──────────────────────────────────────────────────────────┐
│  "SEO & Meta Tags"                                        │
├──────────────────────────────────────────────────────────┤
│  TABLE halaman:                                           │
│  Path | Title | Description | Robots | Last Updated       │
│  /       | BabahAlgo — AI Trading | Mesin kuantitatif... | index | 2 hari lalu │
│  /pricing | Harga — BabahAlgo | Pilih paket... | index | 5 hari lalu │
│  /faq     | FAQ — BabahAlgo | Jawaban... | index | 1 minggu │
├──────────────────────────────────────────────────────────┤
│  Edit form per halaman:                                   │
│  - Title tag (max 60 char, live counter)                  │
│  - Meta description (max 160 char, live counter)          │
│  - OG Title, OG Description, OG Image (URL)              │
│  - Canonical URL                                          │
│  - Robots (index/noindex, follow/nofollow)                │
│  - Structured Data JSON-LD (textarea, auto-validate)      │
│  - [Simpan]  [Test di Google Rich Results ↗]              │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Implementasi SSR + CMS Query

### Next.js Server Component untuk Landing Page

```tsx
// src/app/(guest)/page.tsx — Server Component (SSR)
import { prisma } from '@/lib/db/prisma';

export async function generateMetadata() {
  const meta = await prisma.pageMeta.findUnique({ where: { path: '/' } });
  return {
    title: meta?.title ?? 'BabahAlgo — AI Trading Platform',
    description: meta?.description ?? 'Mesin kuantitatif otonom...',
    openGraph: {
      title: meta?.ogTitle ?? meta?.title,
      description: meta?.ogDescription ?? meta?.description,
      images: meta?.ogImage ? [{ url: meta.ogImage }] : [],
    },
    robots: meta?.robots ?? 'index, follow',
  };
}

export default async function LandingPage() {
  // Parallel queries — semua dalam 1 request ke DB
  const [sections, banners, tiers, testimonials, faqs, settings] = await Promise.all([
    prisma.landingSection.findMany({ where: { visible: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.banner.findMany({ where: { active: true, OR: [{ startAt: null }, { startAt: { lte: new Date() } }], OR: [{ endAt: null }, { endAt: { gte: new Date() } }] } }),
    prisma.pricingTier.findMany({ where: { visible: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.testimonial.findMany({ where: { visible: true }, orderBy: { sortOrder: 'asc' }, take: 6 }),
    prisma.faq.findMany({ where: { visible: true, category: 'general' }, orderBy: { sortOrder: 'asc' }, take: 5 }),
    prisma.siteSetting.findMany(),
  ]);

  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

  return (
    <>
      <ActiveBanners banners={banners} />
      {sections.map(section => (
        <DynamicSection
          key={section.id}
          section={section}
          pricingTiers={section.type === 'pricing' ? tiers : undefined}
          testimonials={section.type === 'testimonials' ? testimonials : undefined}
          faqs={section.type === 'faq-preview' ? faqs : undefined}
          settings={settingsMap}
        />
      ))}
      <ActivePopups />  {/* Client component: cek localStorage untuk frequency */}
    </>
  );
}
```

**Keuntungan SSR + CMS:**
- Halaman guest di-render di server → SEO sempurna (Google crawl HTML lengkap)
- Admin ubah konten → langsung terlihat di next request (tanpa build ulang)
- Revalidasi: `export const revalidate = 300` (cache 5 menit, lalu query ulang)

---

## 8. API Routes CMS (Admin Only)

```
# Site Settings
GET    /api/admin/settings/site      → list all SiteSettings
PATCH  /api/admin/settings/site      → bulk update settings

# Landing Sections
GET    /api/admin/content/sections   → list all (termasuk hidden)
POST   /api/admin/content/sections   → create new section
PATCH  /api/admin/content/sections/:id → update content/order/visibility
DELETE /api/admin/content/sections/:id → delete

# Pricing
GET    /api/admin/content/pricing    → list all tiers
POST   /api/admin/content/pricing    → create tier
PATCH  /api/admin/content/pricing/:id → update
DELETE /api/admin/content/pricing/:id → delete

# Banners
GET    /api/admin/content/banners    → list (filter active/scheduled)
POST   /api/admin/content/banners    → create
PATCH  /api/admin/content/banners/:id → update
DELETE /api/admin/content/banners/:id → delete

# Popups
GET    /api/admin/content/popups     → list
POST   /api/admin/content/popups     → create
PATCH  /api/admin/content/popups/:id → update
DELETE /api/admin/content/popups/:id → delete

# FAQ
GET    /api/admin/content/faq        → list (filter category)
POST   /api/admin/content/faq        → create
PATCH  /api/admin/content/faq/:id    → update
DELETE /api/admin/content/faq/:id    → delete

# Testimonials
GET    /api/admin/content/testimonials → list
POST   /api/admin/content/testimonials → create
PATCH  /api/admin/content/testimonials/:id → update
DELETE /api/admin/content/testimonials/:id → delete

# SEO
GET    /api/admin/content/seo        → list all PageMeta
PATCH  /api/admin/content/seo/:path  → update meta for path

# Inquiries (dari form VPS License)
GET    /api/admin/inquiries          → list (filter status)
PATCH  /api/admin/inquiries/:id      → update status/assignedTo
```

---

## 9. Sprint Tambahan untuk CMS

| # | Task | Est |
|---|------|-----|
| F1 | Prisma schema: tambah 8 model CMS + migration | 2h |
| F2 | Seed data: landing sections default + 3 pricing tiers + 5 FAQ | 2h |
| F3 | API routes CMS: 15 route handlers | 6h |
| F4 | Landing page SSR refactor: dari hardcode ke DB-driven | 4h |
| F5 | Admin content pages: landing editor, pricing, FAQ, testimonials | 8h |
| F6 | Admin banner/popup manager | 4h |
| F7 | Admin SEO manager | 3h |
| F8 | Register flow: 3 route (/signal, /pamm, /vps) | 6h |
| F9 | Public pages: /pricing, /features, /faq, /about, /terms | 4h |
| F10 | Banner + popup client component (render, dismiss, frequency) | 3h |
| F11 | Inquiry table + Telegram notification | 2h |
| **Total** | | **~44 jam (1 sprint penuh)** |

### Urutan prioritas

```
Minggu 1: F1 → F2 → F3 → F4 (DB + API + landing refactor)
Minggu 2: F5 → F8 → F9 (admin content + register + public pages)
Minggu 3: F6 → F7 → F10 → F11 (banner, popup, SEO, inquiry)
```

---

## 10. Referensi File

| File | Fungsi |
|------|--------|
| `dev/arsitektur-komersial-zero-trust.md` | Topologi 3-node, keamanan |
| `dev/layout-chart-design.md` | Detail chart, admin, client layout |
| `dev/brand-cms-guest-concept.md` | **INI** — brand, CMS, guest pages, registrasi |
| `docs/pages.md` | Spec halaman yang sudah diimplementasi |
| `docs/charts.md` | Spec chart component yang sudah dibuat |
