-- Reframe editorial showcase landing section per audit 2026-05-15.
--
-- Pak Abdullah feedback: drift content lama (6 strategi SMC/Wyckoff/Astronacci/
-- AI Momentum/Mean-Rev/Oil-Gas) tidak lagi match backend reality. Backend cuma
-- punya 3 strategi umbrella: SMC Scalper, SMC Swing, Pivot Mean Reversion.
--
-- Strategy slide rewrite:
--   - "Enam strategi" → "Tiga strategi inti + AI Brain"
--   - Subtitle "Lima pilar" → "Lima sorotan" (5 highlights, bukan pillars
--     supaya tidak konflik dengan platform 3-pillar + risk 4-pillar copy)
--
-- ON CONFLICT DO UPDATE supaya re-run migration overwrite content lama.

INSERT INTO "LandingSection" (
  "id", "slug", "title", "title_en", "subtitle", "subtitle_en",
  "content", "content_en", "sortOrder", "isVisible", "updatedAt"
) VALUES
(
  'seed-editorial-showcase',
  'editorial-showcase',
  'Apa yang menjadi tulang punggung sistem.',
  'What anchors the system.',
  'Lima sorotan yang dirancang untuk menjaga konsistensi eksekusi tanpa kompromi pada disiplin risiko.',
  'Five highlights designed to preserve execution consistency without compromising risk discipline.',
  '{"slides":[
    {
      "eyebrow":"STRATEGI",
      "title":"Tiga strategi inti + AI Brain",
      "description":"SMC Scalper (Quasimodo family) · SMC Swing · Pivot Mean Reversion — diorkestrasikan oleh AI Brain (bandit routing pilih konfluensi terbaik, Kelly sizing, adaptive exit) di multi-timeframe (H4 → H1 → M15 → M5).",
      "metric":"3",
      "metricLabel":"STRATEGI INTI",
      "ctaLabel":"Pelajari strategi",
      "ctaHref":"/platform/strategies"
    },
    {
      "eyebrow":"RISK CONTROL",
      "title":"Dua belas lapisan risiko di setiap trade",
      "description":"Spread guard, news blackout, kill-switch bertingkat, daily DD guard, vol-target sizing, correlation guard, dan lainnya — risiko bukan fitur, tapi substrat di mana setiap strategi beroperasi.",
      "metric":"12",
      "metricLabel":"LAYERS",
      "ctaLabel":"Lihat framework",
      "ctaHref":"/platform/risk-framework"
    },
    {
      "eyebrow":"EKSEKUSI",
      "title":"Bridge institusional ZeroMQ → MetaTrader 5",
      "description":"Target sub-2ms latency dengan deterministic slippage budget. Setiap order ter-log dan auditable — bukan klaim, fakta arsitektur.",
      "metric":"<2ms",
      "metricLabel":"TARGET LATENCY",
      "ctaLabel":"Arsitektur teknis",
      "ctaHref":"/platform/execution"
    },
    {
      "eyebrow":"COVERAGE",
      "title":"Forex, Metal, dan Crypto Binance",
      "description":"14+ instrumen tersupport: Forex Major + Cross, Gold + Silver, dan Crypto Spot + USDT-M Futures — satu sistem, dua kelas aset.",
      "metric":"14+",
      "metricLabel":"INSTRUMENTS",
      "ctaLabel":"Lihat instrumen",
      "ctaHref":"/platform/instruments"
    },
    {
      "eyebrow":"ACCESS",
      "title":"Free akses untuk founding members",
      "description":"Beta phase. Seratus trader pertama dapat akses penuh tanpa biaya. Track record live dipublikasi setelah produksi 90 hari.",
      "metric":"0",
      "metricLabel":"IDR / BULAN",
      "ctaLabel":"Daftar founding member",
      "ctaHref":"/contact?subject=beta-founding-member"
    }
  ]}'::jsonb,
  '{"slides":[
    {
      "eyebrow":"STRATEGY",
      "title":"Three core strategies + AI Brain",
      "description":"SMC Scalper (Quasimodo family) · SMC Swing · Pivot Mean Reversion — orchestrated by an AI Brain (bandit routing picks the best confluence, Kelly sizing, adaptive exit) across multi-timeframe (H4 → H1 → M15 → M5).",
      "metric":"3",
      "metricLabel":"CORE STRATEGIES",
      "ctaLabel":"Explore strategies",
      "ctaHref":"/platform/strategies"
    },
    {
      "eyebrow":"RISK CONTROL",
      "title":"Twelve risk layers on every trade",
      "description":"Spread guard, news blackout, multi-stage kill-switch, daily DD guard, vol-target sizing, correlation guard, and more — risk control isn''t a feature, it''s the substrate every strategy runs on.",
      "metric":"12",
      "metricLabel":"LAYERS",
      "ctaLabel":"Read framework",
      "ctaHref":"/platform/risk-framework"
    },
    {
      "eyebrow":"EXECUTION",
      "title":"Institutional ZeroMQ → MetaTrader 5 bridge",
      "description":"Targeted sub-2ms latency with deterministic slippage budget. Every order logged and auditable — architecture fact, not marketing claim.",
      "metric":"<2ms",
      "metricLabel":"TARGET LATENCY",
      "ctaLabel":"Technical architecture",
      "ctaHref":"/platform/execution"
    },
    {
      "eyebrow":"COVERAGE",
      "title":"Forex, Metals, and Crypto on Binance",
      "description":"14+ supported instruments: Forex Major + Cross, Gold + Silver, plus Crypto Spot + USDT-M Futures — one system, two asset classes.",
      "metric":"14+",
      "metricLabel":"INSTRUMENTS",
      "ctaLabel":"See instruments",
      "ctaHref":"/platform/instruments"
    },
    {
      "eyebrow":"ACCESS",
      "title":"Free access for founding members",
      "description":"Beta phase. The first hundred traders get full access at no cost. Live track record publishes after 90 days of production operation.",
      "metric":"0",
      "metricLabel":"IDR / MONTH",
      "ctaLabel":"Apply as founding member",
      "ctaHref":"/contact?subject=beta-founding-member"
    }
  ]}'::jsonb,
  16,
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "title_en" = EXCLUDED."title_en",
  "subtitle" = EXCLUDED."subtitle",
  "subtitle_en" = EXCLUDED."subtitle_en",
  "content" = EXCLUDED."content",
  "content_en" = EXCLUDED."content_en",
  "updatedAt" = CURRENT_TIMESTAMP;
