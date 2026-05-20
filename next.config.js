const createNextIntlPlugin = require('next-intl/plugin');
const { withSentryConfig } = require('@sentry/nextjs');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Sentry + OpenTelemetry pakai dynamic ESM hooks via `import-in-the-middle`
  // dan `require-in-the-middle` yang break saat Turbopack ESM-transform
  // bundle dengan hashed module ID. Mark sebagai external supaya Node.js
  // require() resolve langsung dari node_modules tanpa transformasi.
  serverExternalPackages: [
    '@sentry/nextjs',
    '@sentry/node',
    '@sentry/profiling-node',
    'import-in-the-middle',
    'require-in-the-middle',
  ],
  images: {
    remotePatterns: [
      // Article cover images yang di-upload via admin CMS atau dari external host
      { protocol: 'https', hostname: 'babahalgo.com' },
      { protocol: 'https', hostname: 'cdn.babahalgo.com' },
      // AI image generators (Pollinations.ai sering dipakai untuk article images)
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      // Default Cloudflare Image Optimization passthrough
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.cloudflare-ipfs.com' },
    ],
    // Buffer size limit untuk avoid OOM dari oversize uploads
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  // Security headers — applied ke semua response.
  // CSP yang strict tapi tetap allow:
  //   - Tailwind inline styles (style-src 'unsafe-inline')
  //   - Cloudflare Insights + OG images (img-src wildcard https:)
  //   - Cal.com booking embed (frame-src cal.com)
  //   - OpenRouter API client-side (kalau ada — connect-src babahalgo.com)
  // CSP reportOnly false di production karena sudah curated.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.cal.com https://embed.cal.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.babahalgo.com https://babahalgo.com https://app.cal.com https://api.cal.com https://image.pollinations.ai wss://*.babahalgo.com",
      "frame-src 'self' https://app.cal.com https://embed.cal.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          // Force HTTPS untuk 6 bulan, preload via Cloudflare HSTS.
          { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains; preload' },
          // Anti-clickjack
          { key: 'X-Frame-Options', value: 'DENY' },
          // Anti-MIME sniff
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referer minimal — origin only saat cross-site, full saat same-origin
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions minimal — disable invasive APIs default
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()' },
          // CSP
          { key: 'Content-Security-Policy', value: csp },
          // Cross-origin isolation hints (defensive — tidak strict yet)
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        // Service worker harus served dari root scope + no-cache supaya
        // browser pickup update segera.
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        // Manifest cacheable lebih lama (static).
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },
  async redirects() {
    return [
      // Locale-prefixed auth/admin/portal routes redirect to root
      // (these surfaces are locale-agnostic — they read locale from cookie/UI).
      { source: '/en/login', destination: '/login', permanent: false },
      { source: '/id/login', destination: '/login', permanent: false },
      { source: '/en/admin/:path*', destination: '/admin/:path*', permanent: false },
      { source: '/id/admin/:path*', destination: '/admin/:path*', permanent: false },
      { source: '/en/portal/:path*', destination: '/portal/:path*', permanent: false },
      { source: '/id/portal/:path*', destination: '/portal/:path*', permanent: false },
      // PAMM tier dihentikan 2026-04-26 — model zero-custody (customer pegang
      // dana sendiri di akun broker / Binance). Permanent redirect untuk SEO
      // — Google rewrites backlinks ke target baru.
      { source: '/solutions/pamm', destination: '/solutions/signal', permanent: true },
      { source: '/register/pamm', destination: '/register/signal', permanent: true },
      { source: '/:locale(en|id)/solutions/pamm', destination: '/:locale/solutions/signal', permanent: true },
      { source: '/:locale(en|id)/register/pamm', destination: '/:locale/register/signal', permanent: true },
      // Strategi placeholder (wyckoff/astronacci/ai-momentum/oil-gas) di-purge
      // 2026-05-15 karena tidak ada implementasi backend. Realnya hanya
      // SMC scalper + SMC swing (QM Sempurna family) + Pivot Mean Reversion.
      { source: '/platform/strategies/wyckoff', destination: '/platform/strategies/smc', permanent: true },
      { source: '/platform/strategies/astronacci', destination: '/platform/strategies/smc', permanent: true },
      { source: '/platform/strategies/ai-momentum', destination: '/platform/strategies/smc', permanent: true },
      { source: '/platform/strategies/oil-gas', destination: '/platform/strategies/smc', permanent: true },
      { source: '/:locale(en|id)/platform/strategies/wyckoff', destination: '/:locale/platform/strategies/smc', permanent: true },
      { source: '/:locale(en|id)/platform/strategies/astronacci', destination: '/:locale/platform/strategies/smc', permanent: true },
      { source: '/:locale(en|id)/platform/strategies/ai-momentum', destination: '/:locale/platform/strategies/smc', permanent: true },
      { source: '/:locale(en|id)/platform/strategies/oil-gas', destination: '/:locale/platform/strategies/smc', permanent: true },
    ];
  },
};

const withIntl = withNextIntl(nextConfig);

// Wrap with Sentry only if DSN is configured
module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(withIntl, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : withIntl;
