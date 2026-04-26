-- Seed editorial showcase landing section.
--
-- A 5-slide auto-advancing showcase between Beta Program and Products
-- highlights the system's strengths in editorial cadence (not retail
-- marquee). Slides are CMS-editable via the `content` JSONB field —
-- admin can add/remove/edit slide copy at /admin/cms/landing.
--
-- Schema for content.slides (each item):
--   eyebrow: string         -- "STRATEGI", "RISK CONTROL", etc
--   title: string           -- main headline
--   description: string     -- 1–2 sentence supporting copy
--   metric: string          -- big numeric/short label ("12", "<2ms")
--   metricLabel: string     -- "LAYERS", "TARGET LATENCY"
--   ctaLabel: string?       -- optional CTA button text
--   ctaHref: string?        -- optional CTA link

INSERT INTO "LandingSection" (
  "id", "slug", "title", "title_en", "subtitle", "subtitle_en",
  "content", "content_en", "sortOrder", "isVisible", "updatedAt"
) VALUES
(
  'seed-editorial-showcase',
  'editorial-showcase',
  'Apa yang menjadi tulang punggung sistem.',
  'What anchors the system.',
  'Lima pilar yang dirancang untuk menjaga konsistensi eksekusi tanpa kompromi pada disiplin risiko.',
  'Five pillars designed to preserve execution consistency without compromising risk discipline.',
  '{"slides":[
    {
      "eyebrow":"STRATEGI",
      "title":"Enam strategi multi-confluence",
      "description":"SMC · Wyckoff · Astronacci · AI Momentum · Mean-Reversion · Oil & Gas — bekerja paralel dengan scoring multi-timeframe (H4 → H1 → M15 → M5).",
      "metric":"6",
      "metricLabel":"STRATEGIES",
      "ctaLabel":"Pelajari strategi",
      "ctaHref":"/platform/strategies/smc"
    },
    {
      "eyebrow":"RISK CONTROL",
      "title":"Dua belas lapisan risiko di setiap trade",
      "description":"Spread guard, news blackout, kill-switch, daily DD guard — risiko bukan fitur, tapi substrat di mana setiap strategi beroperasi.",
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
      "title":"Six multi-confluence strategies",
      "description":"SMC · Wyckoff · Astronacci · AI Momentum · Mean-Reversion · Oil & Gas — running in parallel with multi-timeframe scoring (H4 → H1 → M15 → M5).",
      "metric":"6",
      "metricLabel":"STRATEGIES",
      "ctaLabel":"Explore strategies",
      "ctaHref":"/platform/strategies/smc"
    },
    {
      "eyebrow":"RISK CONTROL",
      "title":"Twelve risk layers on every trade",
      "description":"Spread guard, news blackout, kill-switch, daily DD guard — risk control isn''t a feature, it''s the substrate every strategy runs on.",
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
ON CONFLICT ("slug") DO NOTHING;
