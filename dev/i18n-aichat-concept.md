# Konsep Multi-Bahasa (i18n) & AI Chat Support — BabahAlgo

> Dokumen ini mencakup: strategi 2 bahasa dengan maintenance minimal,
> AI chat assistant "Babah", pilihan provider, dan desain chat widget premium.
>
> Tanggal: 2026-04-17 | Prinsip: **Tulis sekali dalam Bahasa Indonesia, English auto-generated**

---

## Bagian 1 — Multi-Bahasa (i18n)

### Pendekatan: Indonesian-First, English Auto-Generated

Anda **TIDAK perlu** menulis konten 2 kali. Strateginya:

1. Admin menulis semua konten **hanya dalam Bahasa Indonesia** (CMS, landing, FAQ, pricing, dll)
2. Sistem otomatis men-generate terjemahan English **sekali** saat admin klik "Generate English"
3. Pengunjung bisa toggle bahasa — Indonesian default, English opsional
4. URL structure: `babahalgo.com` (ID) + `babahalgo.com/en/...` (EN)

### Library: `next-intl`

```bash
npm install next-intl
```

Dipilih karena:
- Native support Next.js 14 App Router + Server Components
- Routing berbasis middleware (bukan folder duplikasi)
- Mendukung dynamic content dari database (bukan hanya JSON statis)
- 12KB gzipped — ringan

**BUKAN** `next-i18next` (itu untuk Pages Router lama).

### Arsitektur i18n

```
babahalgo.com/                    → Bahasa Indonesia (default, tanpa prefix)
babahalgo.com/en/                 → English
babahalgo.com/en/pricing          → English pricing page
babahalgo.com/admin/              → Admin tetap Indonesia saja (internal)
babahalgo.com/portal/             → Portal ikut bahasa user preference
```

### Struktur File

```
src/
├── i18n/
│   ├── config.ts                 # locale list, default locale
│   ├── request.ts                # getRequestConfig untuk next-intl
│   └── messages/
│       ├── id.json               # ← SUMBER KEBENARAN (Anda tulis ini)
│       └── en.json               # ← AUTO-GENERATED dari id.json
├── middleware.ts                  # Tambah locale detection
└── app/
    └── [locale]/                 # Dynamic locale segment
        ├── layout.tsx            # NextIntlClientProvider
        ├── page.tsx              # Landing page
        ├── (guest)/
        │   ├── pricing/
        │   ├── faq/
        │   └── ...
        ├── (admin)/              # Admin TIDAK perlu i18n (tetap ID)
        └── (portal)/             # Portal bisa 2 bahasa
```

### Contoh `id.json` (Sumber kebenaran — Anda hanya edit ini)

```json
{
  "nav": {
    "features": "Fitur",
    "performance": "Performa",
    "pricing": "Harga",
    "faq": "FAQ",
    "login": "Masuk",
    "register": "Daftar"
  },
  "hero": {
    "title": "Kecerdasan Otonom untuk Pasar Finansial",
    "subtitle": "Mesin kuantitatif yang menyatukan 6 strategi analisa dan AI generatif untuk eksekusi perdagangan presisi 24/7",
    "cta_primary": "Lihat Performa",
    "cta_secondary": "Mulai Sekarang"
  },
  "metrics": {
    "pairs": "Instrumen",
    "strategies": "Strategi AI",
    "latency": "Latensi Eksekusi",
    "uptime": "Pemantauan AI"
  },
  "pricing": {
    "title": "Pilih Paket yang Sesuai",
    "signal_basic": "Signal Basic",
    "pamm_pro": "PAMM Pro",
    "vps_license": "VPS License",
    "per_month": "/bulan",
    "profit_share": "bagi hasil",
    "setup_fee": "biaya setup",
    "cta": "Daftar Sekarang",
    "contact": "Hubungi Kami"
  },
  "footer": {
    "disclaimer": "Perdagangan instrumen finansial mengandung risiko kerugian yang signifikan dan mungkin tidak sesuai untuk semua investor.",
    "terms": "Syarat & Ketentuan",
    "privacy": "Kebijakan Privasi",
    "risk": "Disclaimer Risiko"
  },
  "chat": {
    "title": "Babah AI Assistant",
    "placeholder": "Ketik pertanyaan Anda...",
    "greeting": "Halo! Saya Babah, asisten AI BabahAlgo. Ada yang bisa saya bantu tentang layanan kami?",
    "offline": "Babah sedang istirahat. Silakan tinggalkan pesan."
  }
}
```

### Contoh `en.json` (Auto-generated, bisa di-edit manual jika perlu)

```json
{
  "nav": {
    "features": "Features",
    "performance": "Performance",
    "pricing": "Pricing",
    "faq": "FAQ",
    "login": "Login",
    "register": "Sign Up"
  },
  "hero": {
    "title": "Autonomous Intelligence for Financial Markets",
    "subtitle": "A quantitative engine uniting 6 analysis strategies and generative AI for 24/7 precision trade execution",
    "cta_primary": "View Performance",
    "cta_secondary": "Get Started"
  }
}
```

### Auto-Generate English dari Indonesian

Tambah tombol di admin: **"Generate English Translation"**

```
Admin klik tombol
  → POST /api/admin/i18n/generate
    → Baca id.json
    → Kirim ke AI (Gemini Flash / Claude Haiku) dengan prompt:
       "Translate this JSON from Indonesian to English.
        Context: fintech trading platform. Keep keys unchanged.
        Maintain professional, institutional tone."
    → Simpan hasil ke en.json
    → revalidatePath('/')
```

Biaya per generate: ~$0.01 (Gemini Flash) — jalankan sekali setiap kali konten berubah.

### CMS Content i18n

Untuk konten CMS (LandingSection, PricingTier, FAQ, dll), tambah kolom `_en` suffix:

```prisma
model LandingSection {
  // ... existing fields ...
  title       String        // Bahasa Indonesia (sumber kebenaran)
  title_en    String?       // English (auto-generated, nullable)
  subtitle    String?
  subtitle_en String?
  content     Json          // ID content
  content_en  Json?         // EN content (auto-generated)
}

model PricingTier {
  name        String        // "Signal Basic"
  name_en     String?       // "Signal Basic" (biasanya sama)
  tagline     String?       // "Untuk pemula"
  tagline_en  String?       // "For beginners"
  features    Json          // ["Dashboard real-time", ...]
  features_en Json?         // ["Real-time dashboard", ...]
}

model Faq {
  question    String
  question_en String?
  answer      String  @db.Text
  answer_en   String? @db.Text
}
```

**Flow admin:**
1. Admin edit konten dalam Bahasa Indonesia (seperti biasa)
2. Admin klik "Generate English" di halaman CMS
3. Sistem kirim konten ID ke AI → terima terjemahan → simpan ke kolom `_en`
4. Admin bisa edit hasil terjemahan jika perlu (opsional)

### Penggunaan di Frontend

```tsx
// Server Component
import { useTranslations } from 'next-intl';

export default function HeroSection() {
  const t = useTranslations('hero');

  return (
    <section>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
      <button>{t('cta_primary')}</button>
    </section>
  );
}
```

Untuk CMS content, query berdasarkan locale:

```tsx
// Di server component
const locale = await getLocale();
const sections = await prisma.landingSection.findMany({
  where: { isVisible: true },
  orderBy: { sortOrder: 'asc' },
});

// Map ke locale yang benar
const localizedSections = sections.map(s => ({
  ...s,
  title: locale === 'en' && s.title_en ? s.title_en : s.title,
  subtitle: locale === 'en' && s.subtitle_en ? s.subtitle_en : s.subtitle,
  content: locale === 'en' && s.content_en ? s.content_en : s.content,
}));
```

### Language Switcher Component

```tsx
// components/ui/language-switcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'id' ? 'en' : 'id';
    // Ganti /id/pricing → /en/pricing atau sebaliknya
    const newPath = locale === 'id'
      ? `/en${pathname}`
      : pathname.replace(/^\/en/, '') || '/';
    router.push(newPath);
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                 border text-sm hover:bg-accent transition-colors"
    >
      <span className="text-base">{locale === 'id' ? '🇮🇩' : '🇬🇧'}</span>
      <span className="font-medium">{locale === 'id' ? 'ID' : 'EN'}</span>
    </button>
  );
}
```

Posisi: di navbar, sebelah tombol Login.

### Estimasi Implementasi i18n

| Task | Estimasi |
|------|----------|
| Install next-intl + config | 1 jam |
| Buat `id.json` dan `en.json` | 2 jam |
| Refactor halaman guest ke `useTranslations()` | 3 jam |
| Tambah kolom `_en` di 5 model CMS + migration | 1 jam |
| Admin "Generate English" button + API | 2 jam |
| Language switcher component | 30 menit |
| **Total** | **~9.5 jam** |

---

## Bagian 2 — AI Chat Support "Babah"

### Konsep

Chat widget premium di pojok kanan bawah — asisten AI bernama **"Babah"** yang menjawab pertanyaan pengunjung tentang layanan BabahAlgo. Bukan live agent manusia — murni AI, 24/7.

### Perbandingan Provider AI

| Provider | Model | Harga per 1M token | Kualitas | Latency | Streaming |
|----------|-------|--------------------:|----------|---------|-----------|
| **Google AI Studio** | Gemini 2.0 Flash | $0.10 input / $0.40 output | Bagus | ~200ms | Ya |
| **Anthropic** | Claude Haiku 4.5 | $0.80 input / $4.00 output | Sangat bagus | ~300ms | Ya |
| **OpenAI** | GPT-4o Mini | $0.15 input / $0.60 output | Bagus | ~250ms | Ya |
| **OpenRouter** | Multi-model | Markup ~10% di atas provider | Fleksibel | +50ms relay | Ya |
| **Self-hosted** | Llama 3 70B | Gratis (butuh GPU) | Cukup | Variable | Ya |

### Rekomendasi: **Google Gemini Flash via Vercel AI SDK**

Alasan:
1. **Termurah** — $0.10/1M input token. Rata-rata 1 percakapan = ~2000 token = **$0.0002 per chat**. Artinya **5.000 percakapan = $1**.
2. **Vercel AI SDK** sudah built-in support — `@ai-sdk/google` provider
3. **Streaming** — typewriter effect gratis dari SDK
4. Tidak perlu OpenRouter (menghindari tambahan biaya relay + satu dependensi lagi)
5. **Fallback** ke Claude Haiku jika perlu kualitas lebih tinggi — tinggal ganti provider di config

**PENTING:** OpenRouter TIDAK wajib. Untuk chat support, hubungkan langsung ke Google AI Studio API. OpenRouter hanya dipakai di backend trading (untuk advisor decision yang butuh model routing).

### Library Stack

```bash
npm install ai @ai-sdk/google
# atau jika mau pakai Claude:
# npm install ai @ai-sdk/anthropic
```

**`ai`** = Vercel AI SDK — framework universal untuk chat AI di Next.js:
- `useChat()` React hook — handle streaming, message history, loading state
- `streamText()` server function — stream response dari AI
- Provider-agnostic — ganti model tanpa ubah UI

### Arsitektur Chat

```
┌─────────────────────────────────────────────────┐
│  Browser — Chat Widget (pojok kanan bawah)        │
│  ┌─────────────────────────────────────────────┐ │
│  │ 💬 Babah AI Assistant                       │ │
│  │ ─────────────────────────────────────────── │ │
│  │ Babah: Halo! Saya Babah, asisten AI         │ │
│  │        BabahAlgo. Ada yang bisa saya bantu?  │ │
│  │                                              │ │
│  │ User: Berapa harga paket PAMM?               │ │
│  │                                              │ │
│  │ Babah: Kami menawarkan 2 tier PAMM:          │ │
│  │        • PAMM Basic — 20% profit sharing...  │ │
│  │        • PAMM Pro — 25% profit sharing...    │ │
│  │        █ (streaming...)                      │ │
│  │ ─────────────────────────────────────────── │ │
│  │ [Ketik pertanyaan Anda...]        [Kirim →] │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  useChat() hook → POST /api/chat                  │
└───────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Next.js API Route: /api/chat                     │
│                                                   │
│  1. Terima messages[] dari useChat()              │
│  2. Inject system prompt (konteks BabahAlgo)      │
│  3. streamText({ model: google('gemini-2.0-flash-001') })│
│  4. Stream response ke browser (typewriter)       │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Google AI Studio API                             │
│  Model: gemini-2.0-flash-001                      │
│  ~200ms first token, streaming                    │
└─────────────────────────────────────────────────┘
```

### System Prompt untuk "Babah"

```typescript
const BABAH_SYSTEM_PROMPT = `Kamu adalah "Babah", asisten AI resmi BabahAlgo — platform perdagangan kuantitatif otonom milik CV Babah Digital.

IDENTITAS:
- Nama: Babah
- Peran: Menjawab pertanyaan pengunjung tentang layanan, harga, fitur, dan cara bergabung
- Nada: Profesional, ramah, informatif. Gunakan Bahasa Indonesia kecuali user bicara English
- JANGAN pernah mengaku sebagai manusia. Jika ditanya, katakan: "Saya Babah, asisten AI BabahAlgo."

PENGETAHUAN PRODUK:
- BabahAlgo: mesin kuantitatif otonom yang menggabungkan 6 strategi (SMC, Wyckoff, Quasimodo, AI Momentum, Astronacci, Oil & Gas) + AI Gemini untuk eksekusi perdagangan 24/7
- 14 instrumen: 7 forex (EURUSD dll), 2 metals (XAUUSD, XAGUSD), 3 energy (USOIL, UKOIL, XNGUSD), 2 crypto (BTCUSD, ETHUSD)
- 12 lapisan risk management: dynamic lot sizing, catastrophic breaker, daily loss limit, dll
- Arsitektur Zero-Trust 3-lapis (Vercel + VPS Bridge + VPS Backend)

PAKET HARGA:
1. Signal Basic: $49/bulan — Dashboard + sinyal harian
2. Signal VIP: $149/bulan — Dashboard + sinyal real-time + Telegram VIP
3. PAMM Basic: 20% profit sharing — min deposit $500
4. PAMM Pro: 25% profit sharing — min deposit $5,000, prioritas support
5. VPS License: $3,000-$7,500 setup fee + $150-300/bulan maintenance — dedicated VPS, bot eksklusif

CARA DAFTAR:
- Signal/PAMM: Daftar di babahalgo.com/register, pilih paket, bayar atau hubungkan broker
- VPS License: Isi form konsultasi di babahalgo.com/register/vps, tim kami hubungi via WhatsApp

BATASAN:
- JANGAN berikan saran investasi spesifik ("beli XAUUSD sekarang")
- JANGAN janjikan keuntungan atau return tertentu
- Selalu ingatkan: "Perdagangan mengandung risiko, kinerja masa lalu tidak menjamin hasil di masa depan"
- Jika pertanyaan di luar scope (support teknis akun, refund), arahkan ke: WhatsApp support atau email support@babahalgo.com
- JANGAN jawab pertanyaan yang tidak terkait BabahAlgo (cuaca, politik, dll). Katakan: "Saya hanya bisa membantu tentang layanan BabahAlgo."

FORMAT:
- Jawab singkat dan jelas (maks 3 paragraf)
- Gunakan bullet points untuk daftar
- Jika user tanya harga, tampilkan tabel perbandingan
- Akhiri dengan pertanyaan follow-up jika relevan: "Apakah ada yang ingin Anda tanyakan lagi?"`;
```

### API Route: `/api/chat`

```typescript
// src/app/api/chat/route.ts
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export const runtime = 'edge'; // Edge runtime untuk low latency

const SYSTEM_PROMPT = `...`; // System prompt di atas

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: google('gemini-2.0-flash-001'),
    system: SYSTEM_PROMPT,
    messages,
    maxTokens: 500,        // Batasi panjang jawaban
    temperature: 0.3,      // Lebih deterministik, kurang "kreatif"
  });

  return result.toDataStreamResponse();
}
```

### Env Variable Baru

```bash
# .env.example — tambahkan:
GOOGLE_GENERATIVE_AI_API_KEY=   # dari https://aistudio.google.com/apikey
```

Gratis 15 RPM (request per menit) di tier gratis Google AI Studio. Cukup untuk MVP.

---

## Bagian 3 — Desain Chat Widget Premium

### Prinsip Desain

- **Floating** di pojok kanan bawah — tidak mengganggu konten
- **Dark mode** konsisten dengan BabahAlgo theme
- **Minimized state**: ikon chat kecil (56x56px) dengan badge notifikasi
- **Expanded state**: panel 380px lebar x 520px tinggi, shadow premium
- **Animasi**: slide-up saat buka, fade saat tutup (framer-motion)
- **Streaming**: jawaban AI muncul kata per kata (typewriter effect dari Vercel AI SDK)
- **Responsive**: di mobile, chat expand fullscreen (bukan float)

### Layout Visual

#### Minimized (Bubble)

```
                                    ┌────────┐
                                    │  💬    │ 56x56px
                                    │ Babah  │ rounded-full
                                    └────────┘ shadow-2xl
                                      ↑ fixed bottom-6 right-6
                                      pulse animation saat idle
```

#### Expanded (Panel)

```
┌──────────────────────────────────────┐  380px width
│  ┌──────────────────────────────────┐│  520px height (desktop)
│  │ 🤖 Babah AI Assistant       [✕] ││  100vh (mobile)
│  │ ● Online                         ││
│  ├──────────────────────────────────┤│
│  │                                  ││  Scrollable message area
│  │  ┌─────────────────────────────┐ ││
│  │  │ 🤖 Halo! Saya Babah,       │ ││  AI message: bg-muted
│  │  │    asisten AI BabahAlgo.    │ ││  rounded-2xl
│  │  │    Ada yang bisa saya bantu?│ ││  max-w-[85%]
│  │  └─────────────────────────────┘ ││  align-left
│  │                                  ││
│  │         ┌──────────────────────┐ ││
│  │         │ Berapa harga paket   │ ││  User message: bg-primary
│  │         │ PAMM?                │ ││  text-primary-foreground
│  │         └──────────────────────┘ ││  align-right
│  │                                  ││
│  │  ┌─────────────────────────────┐ ││
│  │  │ 🤖 Kami menawarkan 2 tier:  │ ││
│  │  │                             │ ││
│  │  │ • PAMM Basic — 20% profit   │ ││
│  │  │   sharing, min $500         │ ││
│  │  │ • PAMM Pro — 25% profit     │ ││
│  │  │   sharing, min $5,000█      │ ││  Cursor blink saat streaming
│  │  └─────────────────────────────┘ ││
│  │                                  ││
│  ├──────────────────────────────────┤│
│  │  Quick replies (opsional):       ││  Scrollable horizontal
│  │  [Harga] [Fitur] [Cara Daftar]  ││  chip buttons
│  ├──────────────────────────────────┤│
│  │ ┌────────────────────────┐ [➤]  ││  Input area
│  │ │ Ketik pertanyaan...     │      ││  rounded-xl
│  │ └────────────────────────┘      ││  border
│  ├──────────────────────────────────┤│
│  │  Powered by BabahAlgo AI  🔒    ││  Footer 12px
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

### Komponen: `src/components/chat/chat-widget.tsx`

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_REPLIES = [
  { label: 'Harga Paket', message: 'Berapa harga paket yang tersedia?' },
  { label: 'Fitur Utama', message: 'Apa saja fitur utama BabahAlgo?' },
  { label: 'Cara Daftar', message: 'Bagaimana cara mendaftar?' },
  { label: 'Risk Management', message: 'Bagaimana sistem risk management-nya?' },
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: 'greeting',
        role: 'assistant',
        content: 'Halo! Saya Babah, asisten AI BabahAlgo. Ada yang bisa saya bantu tentang layanan kami? 🤖',
      },
    ],
  });

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Notif badge saat chat tertutup dan ada jawaban baru
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessage(false);
  };

  const handleQuickReply = (message: string) => {
    append({ role: 'user', content: message });
  };

  return (
    <>
      {/* ─── Bubble Button (Minimized) ─── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                       bg-primary text-primary-foreground shadow-2xl
                       flex items-center justify-center
                       hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]
                       transition-shadow"
          >
            <MessageCircle className="w-6 h-6" />
            {/* Badge notifikasi */}
            {hasNewMessage && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500
                           rounded-full border-2 border-background"
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── Chat Panel (Expanded) ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(
              'fixed z-50 bg-background border rounded-2xl shadow-2xl',
              'flex flex-col overflow-hidden',
              // Desktop: floating panel
              'bottom-6 right-6 w-[380px] h-[520px]',
              // Mobile: fullscreen
              'max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:rounded-none'
            )}
          >
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Babah AI Assistant</p>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ─── Messages ─── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0
                                    flex items-center justify-center mt-1">
                      <Bot className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    )}
                  >
                    {/* Render markdown sederhana: bold, bullet, link */}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-accent flex-shrink-0
                                    flex items-center justify-center mt-1">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0
                                  flex items-center justify-center">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ─── Quick Replies (hanya muncul jika belum ada input user) ─── */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr.label}
                    onClick={() => handleQuickReply(qr.message)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full border
                               text-xs font-medium hover:bg-accent transition-colors"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {/* ─── Input Area ─── */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-4 py-3 border-t bg-card"
            >
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ketik pertanyaan Anda..."
                disabled={isLoading}
                className="flex-1 rounded-xl border bg-background px-3.5 py-2.5
                           text-sm focus:outline-none focus:ring-2 focus:ring-primary/50
                           disabled:opacity-50 placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground
                           hover:bg-primary/90 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* ─── Footer ─── */}
            <div className="px-4 py-1.5 text-center border-t">
              <p className="text-[10px] text-muted-foreground">
                Powered by BabahAlgo AI · Respons bukan saran investasi
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

### Pasang di Layout Root

```tsx
// src/app/layout.tsx
import { ChatWidget } from '@/components/chat/chat-widget';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ChatWidget />  {/* Muncul di semua halaman publik */}
      </body>
    </html>
  );
}
```

Chat widget **TIDAK muncul** di admin panel (tambah kondisi `pathname.startsWith('/admin')` untuk hide).

### Fitur Premium Tambahan

| Fitur | Deskripsi | Prioritas |
|-------|-----------|-----------|
| **Quick replies** | 4 tombol chip: Harga, Fitur, Cara Daftar, Risk | Sudah termasuk |
| **Typing indicator** | 3 dot bounce saat AI sedang menjawab | Sudah termasuk |
| **Auto-greeting** | Greeting message saat pertama buka | Sudah termasuk |
| **Badge notifikasi** | Dot merah di bubble jika ada jawaban baru | Sudah termasuk |
| **Mobile fullscreen** | Chat expand 100vh di mobile | Sudah termasuk |
| **Streaming** | Kata per kata muncul (typewriter) | Dari Vercel AI SDK |
| **Markdown render** | Bold, bullet, link di jawaban AI | Tambah `react-markdown` jika perlu |
| **Chat history** | Simpan di localStorage, persist across page nav | Tambah 30 menit |
| **Feedback button** | 👍/👎 per jawaban AI | Tambah 1 jam |
| **Handoff to human** | "Hubungi support manusia" → redirect WhatsApp | Tambah 30 menit |
| **Proactive trigger** | Chat otomatis muncul setelah 30 detik di pricing page | Tambah 30 menit |
| **Rate limit chat** | Max 20 pesan per menit per session | Di API route, 30 menit |

### Estimasi Biaya AI per Bulan

| Traffic | Percakapan/hari | Token/bulan | Biaya Gemini Flash |
|---------|----------------|------------:|-------------------:|
| Rendah | 10 | ~600K | **~$0.06** |
| Sedang | 50 | ~3M | **~$0.30** |
| Tinggi | 200 | ~12M | **~$1.20** |
| Sangat tinggi | 1000 | ~60M | **~$6.00** |

Pada skala 200 percakapan/hari, biaya AI hanya **$1.20/bulan**. Sangat terjangkau.

---

## Bagian 4 — Estimasi Implementasi Total

| Komponen | Estimasi | Dependency |
|----------|----------|------------|
| i18n setup (next-intl + config) | 1 jam | `next-intl` |
| Message files (id.json + en.json) | 2 jam | — |
| Refactor halaman guest ke useTranslations | 3 jam | — |
| CMS kolom _en + migration | 1 jam | Prisma migrate |
| Admin "Generate English" API | 2 jam | Google AI |
| Language switcher UI | 30 menit | — |
| AI chat API route (/api/chat) | 1 jam | `ai`, `@ai-sdk/google` |
| Chat widget component | 2 jam | `framer-motion` (sudah ada) |
| System prompt tuning + testing | 1 jam | — |
| Quick replies + typing indicator | Sudah termasuk | — |
| Chat history (localStorage) | 30 menit | — |
| Feedback 👍/👎 + handoff button | 1 jam | — |
| **Total** | **~15 jam** | 3 package baru |

### Package Baru

```bash
npm install next-intl ai @ai-sdk/google
```

### Env Variable Baru

```bash
# .env.example — tambahkan:
GOOGLE_GENERATIVE_AI_API_KEY=    # untuk chat AI "Babah"
```

---

## Bagian 5 — Ringkasan Keputusan

| Keputusan | Pilihan | Alasan |
|-----------|---------|--------|
| Library i18n | `next-intl` | Native App Router, server component support |
| Bahasa default | Bahasa Indonesia | Pasar utama Indonesia |
| Maintenance English | Auto-generate via AI | Admin hanya perlu tulis 1 bahasa |
| Nama AI assistant | **Babah** | Konsisten dengan brand BabahAlgo |
| AI provider untuk chat | **Google Gemini Flash** | Termurah ($0.0002/chat), streaming native |
| AI framework | **Vercel AI SDK** (`ai`) | useChat() hook, streaming, provider-agnostic |
| Bukan OpenRouter | Ya | Hindari markup biaya + satu dependensi lagi |
| Chat UI | Custom-built (bukan third-party) | Konsisten dark theme BabahAlgo, tanpa branding pihak ketiga |
| Chat position | Fixed bottom-right, mobile fullscreen | Standar industri |

---

## Referensi Dokumen

| File | Fungsi |
|------|--------|
| `dev/arsitektur-komersial-zero-trust.md` | Topologi domain babahalgo.com |
| `dev/brand-cms-guest-concept.md` | CMS schema, landing sections |
| `dev/layout-chart-design.md` | Style guide, warna, tipografi |
| `dev/ui-animation-polish-plan.md` | Framer-motion, responsive sidebar |
| `dev/gap-analysis-sprint-cms.md` | Status gap (16/17 ditutup) |
| **`dev/i18n-aichat-concept.md`** | **INI** — i18n + AI chat "Babah" |
